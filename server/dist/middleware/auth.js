"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.optionalAuth = optionalAuth;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const dbRepository_1 = require("../data/dbRepository");
async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized: Missing or invalid Authorization header. Bearer token required.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        res.status(401).json({ message: 'Unauthorized: Missing Bearer token' });
        return;
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
    }
    catch {
        res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
        return;
    }
    try {
        const tokenVersion = await dbRepository_1.repo.getUserTokenVersion(decoded.id);
        if (tokenVersion === null || (decoded.tokenVersion ?? 0) !== tokenVersion) {
            res.status(401).json({ message: 'Unauthorized: Session is no longer valid' });
            return;
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error('[Auth] failed to verify persisted session version:', err);
        res.status(503).json({ message: 'Authentication service is temporarily unavailable' });
    }
}
async function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        next();
        return;
    }
    if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized: Invalid token format' });
        return;
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(authHeader.slice(7), config_1.config.jwtSecret);
    }
    catch {
        res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
        return;
    }
    try {
        const tokenVersion = await dbRepository_1.repo.getUserTokenVersion(decoded.id);
        if (tokenVersion === null || (decoded.tokenVersion ?? 0) !== tokenVersion) {
            res.status(401).json({ message: 'Unauthorized: Session is no longer valid' });
            return;
        }
        req.user = decoded;
        next();
    }
    catch (err) {
        console.error('[Auth] failed to verify persisted optional session version:', err);
        res.status(503).json({ message: 'Authentication service is temporarily unavailable' });
    }
}
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ message: 'Unauthorized: Authentication required' });
            return;
        }
        // Role Barrier 1: Assuming PLATFORM_ADMIN privileges requires globalRole === 'PLATFORM_SUPERADMIN'
        if (req.user.activeRole === 'PLATFORM_ADMIN') {
            if (req.user.globalRole !== 'PLATFORM_SUPERADMIN') {
                res.status(403).json({
                    message: 'Forbidden: PLATFORM_ADMIN role assertion requires verified PLATFORM_SUPERADMIN global authority.',
                });
                return;
            }
            next();
            return;
        }
        // Role Barrier 2: Assuming INSTITUTION_ADMIN privileges requires institutional affiliation
        if (req.user.activeRole === 'INSTITUTION_ADMIN') {
            const isSuperAdmin = req.user.globalRole === 'PLATFORM_SUPERADMIN';
            const isAuthorized = req.user.authorizedRoles?.includes('INSTITUTION_ADMIN');
            if (!isSuperAdmin && (!isAuthorized || !req.user.institutionId)) {
                res.status(403).json({
                    message: 'Forbidden: Active role INSTITUTION_ADMIN requires verified institutional affiliation.',
                });
                return;
            }
        }
        if (!allowedRoles.includes(req.user.activeRole)) {
            res.status(403).json({
                message: `Forbidden: Active role '${req.user.activeRole}' is not authorized for this resource`,
            });
            return;
        }
        next();
    };
}
