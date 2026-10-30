"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ message: 'Unauthorized: Missing or invalid token' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.user = decoded;
        next();
    }
    catch (err) {
        res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
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
            if (req.user.globalRole && req.user.globalRole !== 'PLATFORM_SUPERADMIN') {
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
