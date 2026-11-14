import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectMongoDB, disconnectMongoDB } from '../data/mongoConnection';
import { UserModel } from '../models';

export function assertSafeE2EDatabase(uri: string, nodeEnv?: string): void {
  const currentEnv = nodeEnv ?? process.env.NODE_ENV;
  if (currentEnv === 'production') {
    throw new Error('FATAL SECURITY VIOLATION: E2E user seeding is strictly prohibited when NODE_ENV=production.');
  }

  if (process.env.ALLOW_E2E_SEED !== 'true') {
    throw new Error('FATAL SECURITY VIOLATION: E2E seeding requires explicit environment authorization (ALLOW_E2E_SEED=true).');
  }

  const normalized = (uri || '').toLowerCase();
  if (
    normalized.includes('edusphere_production') ||
    normalized.includes('edusphere_prod') ||
    normalized.includes('/production') ||
    normalized.includes('/prod')
  ) {
    throw new Error(`FATAL SECURITY VIOLATION: Target database '${uri}' is a production database. E2E seeding refused.`);
  }
}

export async function seedE2EUsers(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/edusphere_test';
  assertSafeE2EDatabase(mongoUri);

  // Load passwords strictly from mandatory environment variables (fail closed if missing)
  const learnerPass = process.env.E2E_LEARNER_PASSWORD?.trim();
  const instructorPass = process.env.E2E_INSTRUCTOR_PASSWORD?.trim();
  const instAdminPass = process.env.E2E_INSTADMIN_PASSWORD?.trim() || process.env.E2E_ADMIN_PASSWORD?.trim();

  if (!learnerPass || !instructorPass || !instAdminPass) {
    const missing: string[] = [];
    if (!learnerPass) missing.push('E2E_LEARNER_PASSWORD');
    if (!instructorPass) missing.push('E2E_INSTRUCTOR_PASSWORD');
    if (!instAdminPass) missing.push('E2E_INSTADMIN_PASSWORD or E2E_ADMIN_PASSWORD');

    throw new Error(
      `[FATAL CONFIGURATION ERROR] Missing required E2E credentials: ${missing.join(', ')}. ` +
      `E2E seeding and Playwright tests must share the same environment credentials. ` +
      `Configure these environment variables in your test runner or secrets before executing.`
    );
  }

  // Strict check on Platform Admin seeding: Never allowed in production, and requires explicit opt-in
  const allowSuperAdmin = process.env.ALLOW_E2E_SUPERADMIN === 'true' && process.env.NODE_ENV !== 'production';
  const adminPass = allowSuperAdmin ? process.env.E2E_ADMIN_PASSWORD?.trim() : null;
  if (allowSuperAdmin && !adminPass) {
    throw new Error(
      `[FATAL CONFIGURATION ERROR] ALLOW_E2E_SUPERADMIN=true was requested but E2E_ADMIN_PASSWORD is not set.`
    );
  }

  console.log('\n===============================================================');
  console.log('🌱 SEEDING TEST USERS FOR PLAYWRIGHT E2E');
  console.log('===============================================================\n');

  await connectMongoDB();

  interface E2EUserSeed {
    id: string;
    email: string;
    plainPassword: string;
    fullName: string;
    globalRole: 'PLATFORM_SUPERADMIN' | 'STANDARD_USER';
    activeRole: 'PLATFORM_ADMIN' | 'INSTITUTION_ADMIN' | 'INSTRUCTOR' | 'STUDENT';
    authorizedRoles: Array<'PLATFORM_ADMIN' | 'INSTITUTION_ADMIN' | 'INSTRUCTOR' | 'STUDENT'>;
    institutionId: string | null;
  }

  const testUsers: E2EUserSeed[] = [
    {
      id: 'e2e-user-learner-1',
      email: process.env.E2E_LEARNER_EMAIL || 'test_learner@edusphere.internal',
      plainPassword: learnerPass,
      fullName: 'Alice Learner (E2E Test)',
      globalRole: 'STANDARD_USER',
      activeRole: 'STUDENT',
      authorizedRoles: ['STUDENT'],
      institutionId: null,
    },
    {
      id: 'e2e-user-instructor-1',
      email: process.env.E2E_INSTRUCTOR_EMAIL || 'test_instructor@edusphere.internal',
      plainPassword: instructorPass,
      fullName: 'Prof. Marcus Vance (E2E Test)',
      globalRole: 'STANDARD_USER',
      activeRole: 'INSTRUCTOR',
      authorizedRoles: ['INSTRUCTOR'],
      institutionId: 'tenant-1',
    },
    {
      id: 'e2e-user-instadmin-1',
      email: process.env.E2E_INSTADMIN_EMAIL || 'test_instadmin@edusphere.internal',
      plainPassword: instAdminPass,
      fullName: 'Dean Robert Taylor (E2E Test)',
      globalRole: 'STANDARD_USER',
      activeRole: 'INSTITUTION_ADMIN',
      authorizedRoles: ['INSTITUTION_ADMIN'],
      institutionId: 'tenant-1',
    },
  ];

  if (allowSuperAdmin && adminPass) {
    testUsers.push({
      id: 'e2e-user-admin-root',
      email: process.env.E2E_ADMIN_EMAIL || 'test_admin@edusphere.internal',
      plainPassword: adminPass,
      fullName: 'Dr. Platform Admin (E2E Test)',
      globalRole: 'PLATFORM_SUPERADMIN' as const,
      activeRole: 'PLATFORM_ADMIN' as const,
      authorizedRoles: ['PLATFORM_ADMIN' as const, 'INSTITUTION_ADMIN' as const, 'INSTRUCTOR' as const, 'STUDENT' as const],
      institutionId: null,
    });
  } else {
    console.log('  ℹ️  PLATFORM_SUPERADMIN E2E account skipped (requires ALLOW_E2E_SUPERADMIN=true in non-production)');
  }

  for (const user of testUsers) {
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(user.plainPassword, salt);

    const existingUser = await UserModel.findOne({ email: user.email });

    await UserModel.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          id: user.id,
          email: user.email,
          passwordHash,
          fullName: user.fullName,
          globalRole: user.globalRole,
          activeRole: user.activeRole,
          authorizedRoles: user.authorizedRoles,
          institutionId: user.institutionId,
          tokenVersion: (existingUser?.tokenVersion ?? 0) + 1, // Invalidate any older sessions
          security: { isEmailVerified: true, twoFactorEnabled: false },
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );
    console.log(`  ✅ Upserted E2E user: ${user.email} [${user.activeRole}] (Password sourced securely from environment)`);
  }

  console.log('\n✅ E2E users seeded successfully.');
  await disconnectMongoDB();
}

if (process.argv[1]?.endsWith('seedE2EUsers.ts') || process.argv[1]?.endsWith('seedE2EUsers.js')) {
  seedE2EUsers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal E2E user seeding failure:', err.message);
      process.exit(1);
    });
}
