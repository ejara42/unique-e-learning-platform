import mongoose from 'mongoose';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  TenantModel,
  UserModel,
  CourseModel,
  EnrollmentModel,
} from '../models';

export function assertSafeTestDatabase(uri: string): void {
  // 1. Explicit Environment Validation: Must never run in production; must have explicit test authorization
  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY BARRIER: Disaster Recovery verification drills are strictly forbidden when NODE_ENV=production!');
  }

  const isExplicitTestEnv = process.env.NODE_ENV === 'test' || process.env.ALLOW_DISASTER_RECOVERY_TEST === 'true';
  if (!isExplicitTestEnv) {
    throw new Error('FATAL SECURITY BARRIER: Disaster Recovery verification drills require explicit test environment authorization (NODE_ENV=test or ALLOW_DISASTER_RECOVERY_TEST=true).');
  }

  // 2. Strict Host Validation: Host MUST be local loopback or isolated test container
  let parsedHost = '';
  let dbName = '';
  try {
    const sanitized = uri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
    const parsed = new URL(sanitized);
    parsedHost = parsed.hostname.toLowerCase();
    dbName = parsed.pathname.replace(/^\//, '').split('?')[0];
  } catch {
    const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@]+@)?([^/:]+)(?::\d+)?\/([^?]+)/);
    if (match) {
      parsedHost = match[1].toLowerCase();
      dbName = match[2];
    }
  }

  const allowedLoopbackHosts = new Set(['localhost', '127.0.0.1', '::1', 'mongo-test', 'test-mongo']);
  if (!allowedLoopbackHosts.has(parsedHost)) {
    throw new Error(`FATAL SECURITY BARRIER: Target host '${parsedHost}' is not an authorized local loopback test target. Remote clusters strictly forbidden.`);
  }

  // 3. Target Database Identity Validation: Must strictly match disposable pattern
  const disposablePattern = /^edusphere_synthetic_dr_test(_[a-zA-Z0-9_-]+)?$/;
  if (!disposablePattern.test(dbName)) {
    throw new Error(`FATAL SECURITY BARRIER: Target database '${dbName}' is NOT an authorized disposable DR test database! Must match pattern: ^edusphere_synthetic_dr_test(_.*)?$`);
  }

  // 4. Comparison against active application database
  const activeAppUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/edusphere';
  const activeDbMatch = activeAppUri.match(/\/([a-zA-Z0-9_-]+)(\?|$)/);
  const activeDbName = activeDbMatch ? activeDbMatch[1] : 'edusphere';

  if (dbName === activeDbName) {
    throw new Error(`FATAL SECURITY BARRIER: Target database '${dbName}' matches active application database '${activeDbName}'! Refusing to run destructive DR drill.`);
  }
}

export async function runDisasterRecoveryVerification(customUri?: string): Promise<{
  success: boolean;
  recordsSeeded: number;
  recordsRestored: number;
  checksumMatch: boolean;
  details: string;
}> {
  const testDbName = 'edusphere_synthetic_dr_test';
  const testUri = customUri || process.env.TEST_MONGODB_URI || `mongodb://127.0.0.1:27017/${testDbName}`;

  // Execute immediate safety barrier verification
  assertSafeTestDatabase(testUri);

  console.log('\n===============================================================');
  console.log('🛡️  EDUSPHERE ISOLATED BACKUP & DISASTER RECOVERY VERIFICATION');
  console.log('===============================================================\n');
  console.log(`🎯 Isolated Test Database: ${testUri}`);

  let isConnected = false;
  try {
    await mongoose.connect(testUri, { serverSelectionTimeoutMS: 3000 });
    isConnected = true;
    console.log('✅ Connected to isolated verification test database.');
  } catch (err: any) {
    console.warn(`⚠️  MongoDB service not reachable at ${testUri} (${err.message}).`);
    return {
      success: false,
      recordsSeeded: 0,
      recordsRestored: 0,
      checksumMatch: false,
      details: `MongoDB unavailable for live restore drill: ${err.message}`,
    };
  }

  try {
    // Step 1: Clean slate in isolated test database
    await mongoose.connection.dropDatabase();
    console.log('🧹 [1/5] Isolated test database initialized to clean state.');

    // Step 2: Seed synthetic, disposable records
    const syntheticTenant = {
      id: 'syn-tenant-001',
      name: 'Synthetic Recovery University',
      slug: 'syn-rec-uni',
      domains: ['syn-rec.edu'],
      type: 'UNIVERSITY',
      status: 'VERIFIED',
      contactEmail: 'admin@syn-rec.edu',
      verificationDocuments: [],
      branding: { primaryColor: '#2563eb', secondaryColor: '#1e40af' },
      settings: {
        allowIndependentEnrollment: true,
        requireEnrollmentApproval: false,
        maxStorageQuotaGb: 100,
        enabledFeatures: ['LIVE_CLASSES', 'CERTIFICATES'],
      },
      createdAt: new Date().toISOString(),
    };

    const syntheticUsers = [
      {
        id: 'syn-user-001',
        email: 'dr.tester@syn-rec.edu',
        passwordHash: '$2a$12$eXampleHashedPasswordForSyntheticTestOnly1234567890',
        fullName: 'Dr. Recovery Tester',
        globalRole: 'STANDARD_USER',
        activeRole: 'INSTRUCTOR',
        authorizedRoles: ['INSTRUCTOR', 'STUDENT'],
        institutionId: 'syn-tenant-001',
        security: { isEmailVerified: true, twoFactorEnabled: false },
        createdAt: new Date().toISOString(),
      },
      {
        id: 'syn-user-002',
        email: 'student.dr@syn-rec.edu',
        passwordHash: '$2a$12$eXampleHashedPasswordForSyntheticTestOnly1234567890',
        fullName: 'Synthetic Student',
        globalRole: 'STANDARD_USER',
        activeRole: 'STUDENT',
        authorizedRoles: ['STUDENT'],
        institutionId: 'syn-tenant-001',
        security: { isEmailVerified: true, twoFactorEnabled: false },
        createdAt: new Date().toISOString(),
      },
    ];

    const syntheticCourses = [
      {
        id: 'syn-course-001',
        tenantId: 'syn-tenant-001',
        title: 'Disaster Recovery Principles 101',
        slug: 'dr-principles-101',
        tagline: 'Enterprise Backup & Restore Verification',
        description: 'Comprehensive test of database snapshot recovery procedures.',
        category: 'Engineering',
        level: 'Advanced',
        durationHours: 6,
        instructorId: 'syn-user-001',
        instructorName: 'Dr. Recovery Tester',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
        visibility: 'PUBLIC',
        price: 99,
        rating: 5.0,
        ratingCount: 1,
        enrolledCount: 1,
        isPublished: true,
        learningOutcomes: ['Verify database restores safely', 'Prevent production data loss'],
        modules: [],
        createdAt: new Date().toISOString(),
      },
    ];

    await TenantModel.create(syntheticTenant);
    await UserModel.insertMany(syntheticUsers);
    await CourseModel.insertMany(syntheticCourses);

    const totalSeeded = 1 + syntheticUsers.length + syntheticCourses.length;
    console.log(`🌱 [2/5] Seeded ${totalSeeded} synthetic test records.`);

    // Step 3: Extract Snapshot & Compute Pre-Recovery Checksum
    function canonicalize(data: any): string {
      const clean = (item: any): any => {
        if (Array.isArray(item)) {
          return item.map(clean).sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
        }
        if (item && typeof item === 'object') {
          const res: any = {};
          for (const k of Object.keys(item).sort()) {
            if (k === '_id' || k === '__v' || k === 'updatedAt') continue;
            res[k] = clean(item[k]);
          }
          return res;
        }
        return item;
      };
      return JSON.stringify(clean(data));
    }

    const dumpedTenants = await TenantModel.find().lean();
    const dumpedUsers = await UserModel.find().lean();
    const dumpedCourses = await CourseModel.find().lean();

    const snapshotRaw = {
      tenants: dumpedTenants,
      users: dumpedUsers,
      courses: dumpedCourses,
    };

    const snapshotPayload = JSON.stringify(snapshotRaw);
    const preChecksum = crypto.createHash('sha256').update(canonicalize(snapshotRaw)).digest('hex');
    console.log(`📦 [3/5] Snapshot generated with SHA-256 checksum: ${preChecksum.slice(0, 16)}...`);

    // Step 4: Simulate Catastrophic Data Loss (Wipe Database)
    await TenantModel.deleteMany({});
    await UserModel.deleteMany({});
    await CourseModel.deleteMany({});

    const postWipeCount = (await TenantModel.countDocuments()) + (await UserModel.countDocuments()) + (await CourseModel.countDocuments());
    if (postWipeCount !== 0) {
      throw new Error(`Data wipe simulation failed: ${postWipeCount} records remain.`);
    }
    console.log('💥 [4/5] Simulated disaster: Database wiped (0 records verified).');

    // Step 5: Restore from Snapshot
    const parsedSnapshot = JSON.parse(snapshotPayload);
    await TenantModel.insertMany(parsedSnapshot.tenants);
    await UserModel.insertMany(parsedSnapshot.users);
    await CourseModel.insertMany(parsedSnapshot.courses);

    const restoredTenants = await TenantModel.find().lean();
    const restoredUsers = await UserModel.find().lean();
    const restoredCourses = await CourseModel.find().lean();

    // Re-verify index integrity on restored collections
    await TenantModel.syncIndexes();
    await UserModel.syncIndexes();
    await CourseModel.syncIndexes();

    // Verify foreign-key / relational integrity
    const tenantIds = new Set(restoredTenants.map((t: any) => t.id));
    const userIds = new Set(restoredUsers.map((u: any) => u.id));

    const invalidUserTenantRef = restoredUsers.some((u: any) => u.institutionId && !tenantIds.has(u.institutionId));
    const invalidCourseTenantRef = restoredCourses.some((c: any) => c.tenantId && !tenantIds.has(c.tenantId));
    const invalidCourseInstructorRef = restoredCourses.some((c: any) => c.instructorId && !userIds.has(c.instructorId));

    if (invalidUserTenantRef || invalidCourseTenantRef || invalidCourseInstructorRef) {
      throw new Error('Relational integrity violated: Restored records contain orphaned foreign key references.');
    }

    const restoredRaw = {
      tenants: restoredTenants,
      users: restoredUsers,
      courses: restoredCourses,
    };

    const postChecksum = crypto.createHash('sha256').update(canonicalize(restoredRaw)).digest('hex');
    const totalRestored = restoredTenants.length + restoredUsers.length + restoredCourses.length;
    const isChecksumValid = preChecksum === postChecksum;

    console.log(`🔄 [5/5] Restored ${totalRestored} records. Post-restore SHA-256: ${postChecksum.slice(0, 16)}...`);

    // Teardown test database
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();

    if (totalRestored === totalSeeded && isChecksumValid) {
      console.log('🎉 Disaster recovery drill: 100% Data Integrity Verified!\n');
      return {
        success: true,
        recordsSeeded: totalSeeded,
        recordsRestored: totalRestored,
        checksumMatch: true,
        details: '100% round-trip restoration verified with exact SHA-256 match.',
      };
    } else {
      return {
        success: false,
        recordsSeeded: totalSeeded,
        recordsRestored: totalRestored,
        checksumMatch: isChecksumValid,
        details: 'Integrity mismatch during recovery drill.',
      };
    }
  } catch (err: any) {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.dropDatabase().catch(() => { });
      await mongoose.disconnect().catch(() => { });
    }
    console.error('❌ Disaster recovery drill failed:', err.message);
    return {
      success: false,
      recordsSeeded: 0,
      recordsRestored: 0,
      checksumMatch: false,
      details: err.message,
    };
  }
}

if (process.argv[1]?.includes('verifyBackupRestore')) {
  runDisasterRecoveryVerification()
    .then(res => {
      console.log(JSON.stringify(res, null, 2));
      process.exit(res.success ? 0 : 1);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

