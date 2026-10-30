"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const dbRepository_1 = require("../data/dbRepository");
const config_1 = require("../config");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// POST /api/auth/login - Production User Authentication
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }
        const user = await dbRepository_1.repo.getUserByEmail(email);
        if (!user) {
            res.status(401).json({ message: 'Invalid credentials. User not found.' });
            return;
        }
        const isMatch = bcryptjs_1.default.compareSync(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
            return;
        }
        const tokenPayload = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            globalRole: user.globalRole,
            activeRole: user.activeRole,
            authorizedRoles: user.authorizedRoles || [user.activeRole],
            institutionId: user.institutionId,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, config_1.config.jwtSecret, { expiresIn: '7d' });
        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                activeRole: user.activeRole,
                authorizedRoles: user.authorizedRoles || [user.activeRole],
                institutionId: user.institutionId,
                bio: user.bio,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Login failed', error: err.message });
    }
});
// POST /api/auth/register - Self-service User Registration (Learners, Instructors)
router.post('/register', async (req, res) => {
    try {
        const { fullName, email, password, role } = req.body;
        if (!fullName || !email || !password) {
            res.status(400).json({ message: 'Name, email, and password are required' });
            return;
        }
        // Disallow registering directly as privileged roles via public registration endpoint!
        if (role === 'PLATFORM_ADMIN' || role === 'INSTITUTION_ADMIN') {
            res.status(403).json({ message: 'Privileged administrator accounts cannot be self-registered.' });
            return;
        }
        const existing = await dbRepository_1.repo.getUserByEmail(email);
        if (existing) {
            res.status(409).json({ message: 'An account with this email already exists' });
            return;
        }
        if (password.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters in length' });
            return;
        }
        const salt = bcryptjs_1.default.genSaltSync(12);
        const passwordHash = bcryptjs_1.default.hashSync(password, salt);
        const newUserRole = role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT';
        const authorizedRoles = newUserRole === 'INSTRUCTOR' ? ['INSTRUCTOR', 'STUDENT'] : ['STUDENT'];
        const newUser = {
            id: `user-${(0, uuid_1.v4)().slice(0, 8)}`,
            email: email.toLowerCase().trim(),
            passwordHash,
            fullName: fullName.trim(),
            avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
            globalRole: 'STANDARD_USER',
            activeRole: newUserRole,
            authorizedRoles,
            institutionId: null,
            security: { isEmailVerified: true, twoFactorEnabled: false },
            createdAt: new Date().toISOString(),
        };
        await dbRepository_1.repo.createUser(newUser);
        const tokenPayload = {
            id: newUser.id,
            email: newUser.email,
            fullName: newUser.fullName,
            globalRole: newUser.globalRole,
            activeRole: newUser.activeRole,
            authorizedRoles: newUser.authorizedRoles,
            institutionId: newUser.institutionId,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, config_1.config.jwtSecret, { expiresIn: '7d' });
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: {
                id: newUser.id,
                email: newUser.email,
                fullName: newUser.fullName,
                avatarUrl: newUser.avatarUrl,
                activeRole: newUser.activeRole,
                authorizedRoles: newUser.authorizedRoles,
                institutionId: newUser.institutionId,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Registration failed', error: err.message });
    }
});
// GET /api/auth/me - Authenticated User Profile
router.get('/me', auth_1.requireAuth, async (req, res) => {
    try {
        const user = await dbRepository_1.repo.getUserById(req.user?.id || '');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                avatarUrl: user.avatarUrl,
                activeRole: user.activeRole,
                authorizedRoles: user.authorizedRoles || [user.activeRole],
                institutionId: user.institutionId,
                bio: user.bio,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving profile', error: err.message });
    }
});
// POST /api/auth/switch-role - Secure Role Switching with Authorization Verification
router.post('/switch-role', auth_1.requireAuth, async (req, res) => {
    try {
        const { newRole } = req.body;
        const user = await dbRepository_1.repo.getUserById(req.user?.id || '');
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        const validRoles = ['PLATFORM_ADMIN', 'INSTITUTION_ADMIN', 'INSTRUCTOR', 'STUDENT', 'INDEPENDENT_LEARNER'];
        if (!validRoles.includes(newRole)) {
            res.status(400).json({ message: `Invalid role specified: ${newRole}` });
            return;
        }
        // Role Escalation Barrier 1: Assuming Platform Admin requires global superadmin role
        if (newRole === 'PLATFORM_ADMIN' && user.globalRole !== 'PLATFORM_SUPERADMIN') {
            res.status(403).json({ message: 'Forbidden: Insufficient privileges to assume Platform Administrator role.' });
            return;
        }
        // Role Escalation Barrier 2: Assuming Institution Admin requires explicitly verified authorizedRole and valid institution
        if (newRole === 'INSTITUTION_ADMIN') {
            const isSuperAdmin = user.globalRole === 'PLATFORM_SUPERADMIN';
            const hasAuthorizedRole = user.authorizedRoles?.includes('INSTITUTION_ADMIN');
            if (!isSuperAdmin && (!hasAuthorizedRole || !user.institutionId)) {
                res.status(403).json({ message: 'Forbidden: You do not have verified institutional administrator authorization.' });
                return;
            }
        }
        // Role Escalation Barrier 3: Standard role assumption must be within user's persisted authorized roles
        if (user.globalRole !== 'PLATFORM_SUPERADMIN') {
            const allowedRoles = user.authorizedRoles || [user.activeRole];
            if (!allowedRoles.includes(newRole)) {
                res.status(403).json({ message: `Forbidden: Role '${newRole}' is not authorized for this account.` });
                return;
            }
        }
        const updatedUser = await dbRepository_1.repo.updateUserRole(user.id, newRole);
        if (!updatedUser) {
            res.status(500).json({ message: 'Failed to update user role' });
            return;
        }
        const tokenPayload = {
            id: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.fullName,
            globalRole: updatedUser.globalRole,
            activeRole: updatedUser.activeRole,
            authorizedRoles: updatedUser.authorizedRoles || [updatedUser.activeRole],
            institutionId: updatedUser.institutionId,
        };
        const token = jsonwebtoken_1.default.sign(tokenPayload, config_1.config.jwtSecret, { expiresIn: '7d' });
        res.json({
            message: `Active role switched to ${newRole}`,
            token,
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                fullName: updatedUser.fullName,
                avatarUrl: updatedUser.avatarUrl,
                activeRole: updatedUser.activeRole,
                authorizedRoles: updatedUser.authorizedRoles || [updatedUser.activeRole],
                institutionId: updatedUser.institutionId,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to switch role', error: err.message });
    }
});
exports.default = router;
