import { connectMongoDB, disconnectMongoDB } from '../data/mongoConnection';
import { UserModel, EnrollmentModel, CertificateModel, AuditLogModel } from '../models';
import { v4 as uuidv4 } from 'uuid';

export async function purgeDemoUsers(): Promise<{ success: boolean; deletedCount: number; message: string }> {
  console.log('\n===============================================================');
  console.log('🧹 EDUSPHERE: PURGE ALL LEGACY DEMO PERSONAS & DUMMY DATA');
  console.log('===============================================================\n');

  try {
    const connected = await connectMongoDB();
    if (!connected) {
      console.error('❌ Database connection failed. A working MongoDB instance is required.');
      return { success: false, deletedCount: 0, message: 'Database connection failed' };
    }

    const query = {
      $or: [
        { email: { $regex: /@edusphere\.io$/i } },
        { id: { $in: ['user-admin', 'user-instadmin', 'user-instructor', 'user-student'] } }
      ]
    };

    const demoUsers = await UserModel.find(query).lean();
    let deletedCount = 0;

    if (demoUsers.length > 0) {
      console.log(`Found ${demoUsers.length} legacy demo user account(s):`);
      for (const u of demoUsers) {
        console.log(` - ${u.email} (${u.activeRole}, ID: ${u.id})`);
      }
      const deleteResult = await UserModel.deleteMany(query);
      deletedCount = deleteResult.deletedCount;
      console.log(`✅ Successfully purged ${deletedCount} legacy demo user account(s).`);
    } else {
      console.log('ℹ️  Zero demo user accounts in database.');
    }

    // Purge any orphan demo enrollments
    const delEnr = await EnrollmentModel.deleteMany({
      learnerId: { $in: ['user-student', 'user-instructor', 'user-admin', 'user-instadmin'] }
    });
    if (delEnr.deletedCount > 0) {
      console.log(`✅ Purged ${delEnr.deletedCount} dummy enrollment records tied to demo personas.`);
    }

    // Purge any orphan demo certificates
    const delCert = await CertificateModel.deleteMany({
      learnerId: { $in: ['user-student', 'user-instructor', 'user-admin', 'user-instadmin'] }
    });
    if (delCert.deletedCount > 0) {
      console.log(`✅ Purged ${delCert.deletedCount} dummy certificate records tied to demo personas.`);
    }

    // Audit log
    await AuditLogModel.create({
      id: `log-${uuidv4().slice(0, 8)}`,
      tenantId: null,
      actorId: 'system-migration',
      actorName: 'System Migration Utility',
      actorRole: 'PLATFORM_ADMIN',
      action: 'PURGE_LEGACY_DEMO_PERSONAS',
      resourceType: 'USER',
      resourceId: 'all-demo-personas',
      details: `Purged legacy demo personas (@edusphere.io) and associated dummy records`,
      ipAddress: '127.0.0.1',
      timestamp: new Date().toISOString(),
    });

    await disconnectMongoDB();
    console.log('\nDatabase is now completely clean and ready for legitimate superadministrator bootstrap.\n');
    return { success: true, deletedCount, message: `Purged ${deletedCount} demo users` };
  } catch (err: any) {
    console.error('❌ Purge Error:', err.message);
    return { success: false, deletedCount: 0, message: err.message };
  }
}

if (require.main === module) {
  purgeDemoUsers()
    .then((res) => {
      process.exit(res.success ? 0 : 1);
    })
    .catch((err) => {
      console.error('[Purge CLI Error]', err);
      process.exit(1);
    });
}
