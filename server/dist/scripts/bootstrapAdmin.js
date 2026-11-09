"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordPolicy = validatePasswordPolicy;
exports.bootstrapPlatformAdmin = bootstrapPlatformAdmin;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const mongoose_1 = __importDefault(require("mongoose"));
const uuid_1 = require("uuid");
const mongoConnection_1 = require("../data/mongoConnection");
const models_1 = require("../models");
function validatePasswordPolicy(password) {
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
async function bootstrapPlatformAdmin(opts) {
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
        const connected = await (0, mongoConnection_1.connectMongoDB)();
        if (!connected || mongoose_1.default.connection.readyState !== 1) {
            const errorMsg = 'Database connection failed: MongoDB is unavailable. A healthy MongoDB connection is required to bootstrap the platform superadministrator.';
            console.error(`❌ ${errorMsg}`);
            return { success: false, message: errorMsg };
        }
    }
    catch (err) {
        const errorMsg = `Database connection failed: ${err.message}`;
        console.error(`❌ ${errorMsg}`);
        return { success: false, message: errorMsg };
    }
    try {
        // 5. Safety Gate: Ensure no superadmin already exists
        const existingAdmin = (await models_1.UserModel.findOne({}).lean());
        if (existingAdmin) {
            const abortMsg = `Aborted: The database already contains a user (${existingAdmin.email}). Bootstrap requires an empty user collection.`;
            console.warn(`⚠️  ${abortMsg}`);
            if (!opts?.preserveConnection) {
                await (0, mongoConnection_1.disconnectMongoDB)();
            }
            return { success: false, message: abortMsg };
        }
        // 6. Check if target email already exists
        const emailInUse = (await models_1.UserModel.findOne({ email }).lean());
        if (emailInUse) {
            const abortMsg = `Aborted: User with email ${email} already exists.`;
            console.warn(`⚠️  ${abortMsg}`);
            if (!opts?.preserveConnection) {
                await (0, mongoConnection_1.disconnectMongoDB)();
            }
            return { success: false, message: abortMsg };
        }
        // 7. Hash password using bcrypt cost factor 12
        const salt = bcryptjs_1.default.genSaltSync(12);
        const passwordHash = bcryptjs_1.default.hashSync(password, salt);
        const adminUser = new models_1.UserModel({
            id: `admin-${(0, uuid_1.v4)().slice(0, 8)}`,
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
        await models_1.AuditLogModel.create({
            id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
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
            await (0, mongoConnection_1.disconnectMongoDB)();
        }
        return { success: true, message: 'Platform administrator provisioned successfully', email };
    }
    catch (err) {
        console.error('[Bootstrap Error]', err);
        if (!opts?.preserveConnection) {
            await (0, mongoConnection_1.disconnectMongoDB)();
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
        }
        catch (err) {
            console.error('[Bootstrap CLI Error]', err);
            process.exit(1);
        }
    })();
}
