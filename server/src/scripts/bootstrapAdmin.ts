import readline from 'readline';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { connectMongoDB, disconnectMongoDB } from '../data/mongoConnection';
import { UserModel, AuditLogModel } from '../models';

export interface BootstrapOptions {
  email?: string;
  password?: string;
  fullName?: string;
  preserveConnection?: boolean;
}

export function askPrompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export function askSecret(promptText: string): Promise<string> {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(promptText, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    process.stdout.write(promptText);
    let secret = '';

    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\n' || char === '\r' || char === '\u0004') {
          process.stdin.setRawMode(wasRaw || false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(secret.trim());
          return;
        } else if (char === '\u0003') {
          process.stdin.setRawMode(wasRaw || false);
          process.stdin.pause();
          process.stdin.removeListener('data', onData);
          process.stdout.write('\n');
          process.exit(130);
        } else if (char === '\b' || char === '\x7f') {
          if (secret.length > 0) {
            secret = secret.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          secret += char;
          process.stdout.write('*');
        }
      }
    };

    process.stdin.on('data', onData);
  });
}

export function parseArgs(): BootstrapOptions {
  const args = process.argv.slice(2);
  const options: BootstrapOptions = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--email' && args[i + 1]) {
      options.email = args[i + 1];
      i++;
    } else if (args[i] === '--name' && args[i + 1]) {
      options.fullName = args[i + 1];
      i++;
    } else if (args[i] === '--password') {
      console.error(
        '\n❌ Security Violation: Passing passwords via command-line arguments (--password) is prohibited.\n' +
        '   Command line arguments are captured in OS process tables (ps, Task Manager) and shell history.\n' +
        '   Please enter your password securely via the interactive masked prompt or supply INITIAL_ADMIN_PASSWORD in your environment.\n'
      );
      process.exit(1);
    }
  }

  return options;
}

export function validatePasswordPolicy(password: string): { valid: boolean; reason?: string } {
  if (password.length < 12) {
    return { valid: false, reason: 'Password must be at least 12 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one number.' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one special character.' };
  }
  return { valid: true };
}

export async function bootstrapPlatformAdmin(opts?: BootstrapOptions): Promise<{ success: boolean; message: string; email?: string }> {
  console.log('\n===============================================================');
  console.log('🛡️  EDUSPHERE SECURE PLATFORM ADMINISTRATOR BOOTSTRAP');
  console.log('===============================================================\n');

  // 1. Resolve email
  const email = (opts?.email || process.env.INITIAL_ADMIN_EMAIL || '').trim().toLowerCase();

  // 2. Resolve password
  const password = opts?.password || process.env.INITIAL_ADMIN_PASSWORD || '';

  // 3. Resolve full name
  const fullName = (opts?.fullName || process.env.INITIAL_ADMIN_NAME || 'Platform Administrator').trim();

  if (!email || !password) {
    const errorMsg = 'Error: Missing administrator credentials. INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD must be provided via interactive prompt, environment variables, or bootstrap options.';
    console.error(`❌ ${errorMsg}`);
    return { success: false, message: errorMsg };
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    const errorMsg = `Error: Invalid email format: ${email}`;
    console.error(`❌ ${errorMsg}`);
    return { success: false, message: errorMsg };
  }

  // Password policy validation
  const policyCheck = validatePasswordPolicy(password);
  if (!policyCheck.valid) {
    console.error(`❌ Password Policy Violation: ${policyCheck.reason}`);
    return { success: false, message: `Password policy failed: ${policyCheck.reason}` };
  }

  // 4. Connect to database & verify readiness
  try {
    const connected = await connectMongoDB();
    if (!connected || mongoose.connection.readyState !== 1) {
      const errorMsg = 'Database connection failed: MongoDB is unavailable. A healthy MongoDB connection is required to bootstrap the platform superadministrator.';
      console.error(`❌ ${errorMsg}`);
      return { success: false, message: errorMsg };
    }
  } catch (err: any) {
    const errorMsg = `Database connection failed: ${err.message}`;
    console.error(`❌ ${errorMsg}`);
    return { success: false, message: errorMsg };
  }

  try {
    // 5. Safety Gate: Ensure no superadmin already exists
    const existingAdmin = (await UserModel.findOne({
      $or: [{ globalRole: 'PLATFORM_SUPERADMIN' }, { activeRole: 'PLATFORM_ADMIN' }]
    }).lean()) as any;

    if (existingAdmin) {
      const abortMsg = `Aborted: Platform SuperAdmin already exists (${existingAdmin.email}). The bootstrap routine can only initialize the first root administrator.`;
      console.warn(`⚠️  ${abortMsg}`);
      if (!opts?.preserveConnection) {
        await disconnectMongoDB();
      }
      return { success: false, message: abortMsg };
    }

    // 6. Check if target email already exists
    const emailInUse = (await UserModel.findOne({ email }).lean()) as any;
    if (emailInUse) {
      const abortMsg = `Aborted: User with email ${email} already exists.`;
      console.warn(`⚠️  ${abortMsg}`);
      if (!opts?.preserveConnection) {
        await disconnectMongoDB();
      }
      return { success: false, message: abortMsg };
    }

    // 7. Hash password using bcrypt cost factor 12
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(password, salt);

    const adminUser = new UserModel({
      id: `admin-${uuidv4().slice(0, 8)}`,
      email,
      passwordHash,
      fullName,
      globalRole: 'PLATFORM_SUPERADMIN',
      activeRole: 'PLATFORM_ADMIN',
      authorizedRoles: ['PLATFORM_ADMIN', 'INSTRUCTOR', 'STUDENT'],
      institutionId: null,
      security: {
        isEmailVerified: true,
        twoFactorEnabled: true,
      },
      createdAt: new Date().toISOString(),
    });

    await adminUser.save();

    // 8. Durable Audit Trail
    await AuditLogModel.create({
      id: `log-${uuidv4().slice(0, 8)}`,
      tenantId: null,
      actorId: adminUser.id,
      actorName: adminUser.fullName,
      actorRole: 'PLATFORM_ADMIN',
      action: 'PLATFORM_BOOTSTRAP_INITIAL_ADMIN',
      resourceType: 'USER',
      resourceId: adminUser.id,
      details: `Initial root platform administrator provisioned: ${email}`,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    console.log(`✅ Success: Root Platform Administrator provisioned!`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: PLATFORM_ADMIN (Global SuperAdmin)`);
    console.log(`   Security: 2FA Enabled, bcrypt cost 12\n`);

    if (!opts?.preserveConnection) {
      await disconnectMongoDB();
    }
    return { success: true, message: 'Platform administrator provisioned successfully', email };
  } catch (err: any) {
    console.error('[Bootstrap Error]', err);
    if (!opts?.preserveConnection) {
      await disconnectMongoDB();
    }
    return { success: false, message: `Bootstrap operation failed: ${err.message}` };
  }
}

// CLI Execution entrypoint with interactive prompting
if (require.main === module) {
  (async () => {
    try {
      const cliArgs = parseArgs();

      let email = cliArgs.email || process.env.INITIAL_ADMIN_EMAIL;
      let fullName = cliArgs.fullName || process.env.INITIAL_ADMIN_NAME;
      let password = process.env.INITIAL_ADMIN_PASSWORD;

      // If interactive TTY session and missing email, prompt for it
      if (!email && process.stdin.isTTY) {
        console.log('--- Enter SuperAdmin Credentials ---');
        email = await askPrompt('Administrator Email: ');
      }

      if (!fullName && process.stdin.isTTY) {
        const inputName = await askPrompt('Full Name [Platform Administrator]: ');
        fullName = inputName || 'Platform Administrator';
      }

      // If missing password and interactive TTY, prompt securely with mask
      if (!password && process.stdin.isTTY) {
        const pass1 = await askSecret('Administrator Password (masked): ');
        const pass2 = await askSecret('Confirm Password: ');
        if (pass1 !== pass2) {
          console.error('\n❌ Error: Passwords do not match.');
          process.exit(1);
        }
        password = pass1;
      }

      const res = await bootstrapPlatformAdmin({
        email,
        fullName,
        password,
      });

      process.exit(res.success ? 0 : 1);
    } catch (err: any) {
      console.error('[Bootstrap CLI Error]', err);
      process.exit(1);
    }
  })();
}
