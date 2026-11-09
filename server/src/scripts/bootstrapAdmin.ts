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
    const existingAdmin = (await UserModel.findOne({}).lean()) as any;

    if (existingAdmin) {
      const abortMsg = `Aborted: The database already contains a user (${existingAdmin.email}). Bootstrap requires an empty user collection.`;
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

// CLI-only bootstrap. Credentials must be supplied through the process environment.
if (require.main === module) {
  (async () => {
    try {
      const res = await bootstrapPlatformAdmin({
        email: process.env.INITIAL_ADMIN_EMAIL,
        fullName: process.env.INITIAL_ADMIN_NAME,
        password: process.env.INITIAL_ADMIN_PASSWORD,
      });

      process.exit(res.success ? 0 : 1);
    } catch (err: any) {
      console.error('[Bootstrap CLI Error]', err);
      process.exit(1);
    }
  })();
}
