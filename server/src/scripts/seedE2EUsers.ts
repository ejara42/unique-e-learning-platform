import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import bcrypt from 'bcryptjs';
import { connectMongoDB, disconnectMongoDB } from '../data/mongoConnection';
import { UserModel } from '../models';

export async function seedE2EUsers(): Promise<void> {
  console.log('\n===============================================================');
  console.log('🌱 SEEDING DETERMINISTIC TEST USERS FOR PLAYWRIGHT E2E');
  console.log('===============================================================\n');

  await connectMongoDB();

  const testUsers = [
    {
      id: 'e2e-user-learner-1',
      email: 'e2e_learner@edusphere.io',
      plainPassword: 'EduSphere#2026!Learner',
      fullName: 'Alice Learner (E2E)',
      globalRole: 'STANDARD_USER' as const,
      activeRole: 'STUDENT' as const,
      authorizedRoles: ['STUDENT' as const],
      institutionId: null,
    },
    {
      id: 'e2e-user-instructor-1',
      email: 'e2e_instructor@edusphere.io',
      plainPassword: 'EduSphere#2026!Instructor',
      fullName: 'Prof. Marcus Vance (E2E)',
      globalRole: 'STANDARD_USER' as const,
      activeRole: 'INSTRUCTOR' as const,
      authorizedRoles: ['INSTRUCTOR' as const, 'STUDENT' as const],
      institutionId: 'tenant-1',
    },
    {
      id: 'e2e-user-admin-root',
      email: 'e2e_admin@edusphere.io',
      plainPassword: 'EduSphere#2026!Admin',
      fullName: 'Dr. Katherine SuperAdmin (E2E)',
      globalRole: 'PLATFORM_SUPERADMIN' as const,
      activeRole: 'PLATFORM_ADMIN' as const,
      authorizedRoles: ['PLATFORM_ADMIN' as const, 'INSTITUTION_ADMIN' as const, 'INSTRUCTOR' as const, 'STUDENT' as const],
      institutionId: null,
    },
    {
      id: 'e2e-user-instadmin-1',
      email: 'e2e_instadmin@edusphere.io',
      plainPassword: 'EduSphere#2026!InstAdmin',
      fullName: 'Dean Robert Taylor (E2E)',
      globalRole: 'STANDARD_USER' as const,
      activeRole: 'INSTITUTION_ADMIN' as const,
      authorizedRoles: ['INSTITUTION_ADMIN' as const, 'INSTRUCTOR' as const, 'STUDENT' as const],
      institutionId: 'tenant-1',
    },
  ];

  for (const user of testUsers) {
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(user.plainPassword, salt);

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
          tokenVersion: 0,
          security: { isEmailVerified: true, twoFactorEnabled: false },
          createdAt: new Date().toISOString(),
        },
      },
      { upsert: true, new: true }
    );
    console.log(`  ✅ Upserted E2E user: ${user.email} [${user.activeRole}]`);
  }

  console.log('\n✅ All Playwright E2E users seeded successfully.');
  await disconnectMongoDB();
}

if (process.argv[1]?.endsWith('seedE2EUsers.ts') || process.argv[1]?.endsWith('seedE2EUsers.js')) {
  seedE2EUsers()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Fatal E2E user seeding failure:', err);
      process.exit(1);
    });
}
