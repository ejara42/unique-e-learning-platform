"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetAdminCredentials = resetAdminCredentials;
const readline_1 = __importDefault(require("readline"));
const mongoConnection_1 = require("../data/mongoConnection");
const models_1 = require("../models");
const bootstrapAdmin_1 = require("./bootstrapAdmin");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
function askPrompt(question) {
    const prompt = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => prompt.question(question, answer => {
        prompt.close();
        resolve(answer.trim());
    }));
}
function askSecret(question) {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
        return askPrompt(question);
    }
    return new Promise(resolve => {
        process.stdout.write(question);
        let secret = '';
        const previousRawMode = process.stdin.isRaw;
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');
        const onData = (chunk) => {
            for (const char of chunk) {
                if (char === '\n' || char === '\r') {
                    process.stdin.setRawMode(previousRawMode || false);
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);
                    process.stdout.write('\n');
                    resolve(secret);
                    return;
                }
                if (char === '\u0003') {
                    process.stdin.setRawMode(previousRawMode || false);
                    process.stdin.pause();
                    process.stdin.removeListener('data', onData);
                    process.exit(130);
                }
                if (char === '\b' || char === '\x7f') {
                    secret = secret.slice(0, -1);
                    process.stdout.write('\b \b');
                }
                else {
                    secret += char;
                    process.stdout.write('*');
                }
            }
        };
        process.stdin.on('data', onData);
    });
}
async function resetAdminCredentials() {
    console.log('\n===============================================================');
    console.log('🔑 EDUSPHERE: PLATFORM SUPERADMIN CREDENTIAL RESET');
    console.log('===============================================================\n');
    const connected = await (0, mongoConnection_1.connectMongoDB)();
    if (!connected) {
        console.error('❌ Database connection failed. A working MongoDB instance is required.');
        process.exit(1);
    }
    // Find the platform superadmin in the database
    const admin = await models_1.UserModel.findOne({
        $or: [{ globalRole: 'PLATFORM_SUPERADMIN' }, { activeRole: 'PLATFORM_ADMIN' }]
    });
    if (!admin) {
        console.error('❌ No Platform SuperAdmin found in database. Run "npm run bootstrap:admin" to create one.');
        await (0, mongoConnection_1.disconnectMongoDB)();
        process.exit(1);
    }
    console.log(`Current SuperAdmin Account in Database:`);
    console.log(` - ID: ${admin.id}`);
    console.log(` - Full Name: ${admin.fullName}`);
    console.log(` - Current Registered Email: ${admin.email}\n`);
    // Prompt for email (allows fixing typos)
    const inputEmail = await askPrompt(`Enter correct email [${admin.email}]: `);
    const newEmail = (inputEmail || admin.email).trim().toLowerCase();
    const inputName = await askPrompt(`Enter full name [${admin.fullName}]: `);
    const newFullName = (inputName || admin.fullName).trim();
    // Email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
        console.error(`\n❌ Error: Invalid email format: ${newEmail}`);
        await (0, mongoConnection_1.disconnectMongoDB)();
        process.exit(1);
    }
    // Prompt for new password
    const pass1 = await askSecret('Enter new secure password (min 12 chars, upper/lower/digit/symbol): ');
    const pass2 = await askSecret('Confirm new password: ');
    if (pass1 !== pass2) {
        console.error('\n❌ Error: Passwords do not match.');
        await (0, mongoConnection_1.disconnectMongoDB)();
        process.exit(1);
    }
    const policyCheck = (0, bootstrapAdmin_1.validatePasswordPolicy)(pass1);
    if (!policyCheck.valid) {
        console.error(`\n❌ Password Policy Violation: ${policyCheck.reason}`);
        await (0, mongoConnection_1.disconnectMongoDB)();
        process.exit(1);
    }
    // Hash new password with bcrypt cost 12
    const salt = bcryptjs_1.default.genSaltSync(12);
    const passwordHash = bcryptjs_1.default.hashSync(pass1, salt);
    admin.email = newEmail;
    admin.fullName = newFullName;
    admin.passwordHash = passwordHash;
    await admin.save();
    // Audit log
    await models_1.AuditLogModel.create({
        id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
        tenantId: null,
        actorId: admin.id,
        actorName: admin.fullName,
        actorRole: 'PLATFORM_ADMIN',
        action: 'PLATFORM_SUPERADMIN_CREDENTIALS_RESET',
        resourceType: 'USER',
        resourceId: admin.id,
        details: `Platform SuperAdmin credentials reset: email=${admin.email}`,
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString(),
    });
    console.log(`\n✅ Platform SuperAdministrator credentials updated successfully!`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Full Name: ${admin.fullName}`);
    console.log(`   Role: PLATFORM_ADMIN (Global SuperAdmin)`);
    console.log(`   Security: bcrypt cost 12, ready for login at http://localhost:5173/login\n`);
    await (0, mongoConnection_1.disconnectMongoDB)();
}
if (require.main === module) {
    resetAdminCredentials()
        .then(() => process.exit(0))
        .catch(err => {
        console.error('[Reset Error]', err);
        process.exit(1);
    });
}
