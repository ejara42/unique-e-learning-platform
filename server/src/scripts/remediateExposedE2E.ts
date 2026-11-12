import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import { connectMongoDB, disconnectMongoDB } from '../data/mongoConnection';
import { UserModel, SecurityTokenModel } from '../models';

export async function remediateExposedE2E(): Promise<void> {
  console.log('\n===============================================================');
  console.log('🔒 EXPOSED E2E CREDENTIAL REVOCATION & PURGE');
  console.log('===============================================================\n');

  await connectMongoDB();

  const compromisedEmails = [
    'e2e_learner@edusphere.io',
    'e2e_instructor@edusphere.io',
    'e2e_admin@edusphere.io',
    'e2e_instadmin@edusphere.io',
  ];

  console.log(`[Security] Scanning for ${compromisedEmails.length} exposed E2E identities in database...`);

  const foundUsers = await UserModel.find({ email: { $in: compromisedEmails } });

  if (foundUsers.length === 0) {
    console.log('[Security] No exposed E2E accounts found in active database.');
  } else {
    for (const u of foundUsers) {
      console.log(`  🚨 Revoking sessions and purging exposed user: ${u.email} (Role: ${u.activeRole}, GlobalRole: ${u.globalRole})`);
      // Delete any associated security tokens
      await SecurityTokenModel.deleteMany({ userId: u.id });
      // Delete user document to completely eliminate login capability
      await UserModel.deleteOne({ _id: u._id });
      console.log(`  ✅ Purged exposed user and revoked all sessions: ${u.email}`);
    }
  }

  console.log('\n[Security] Compromised E2E account remediation complete.');
  await disconnectMongoDB();
}

if (process.argv[1]?.endsWith('remediateExposedE2E.ts') || process.argv[1]?.endsWith('remediateExposedE2E.js')) {
  remediateExposedE2E()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('[Security] Remediation script failed:', err);
      process.exit(1);
    });
}
