"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../middleware/auth");
const dbRepository_1 = require("../data/dbRepository");
const models_1 = require("../models");
const cdnSecurityService_1 = require("../services/cdnSecurityService");
const validate_1 = require("../middleware/validate");
const config_1 = require("../config");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const mediaParamsSchema = zod_1.z.object({
    courseId: zod_1.z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
    lessonId: zod_1.z.string().trim().min(1).max(128).regex(/^[A-Za-z0-9_-]+$/),
}).strict();
async function hasMediaAccess(req, courseId, lessonId) {
    const course = await dbRepository_1.repo.getCourseById(courseId);
    if (!course || !course.isPublished)
        return false;
    const lessonExists = course.modules.some(module => module.lessons.some(lesson => lesson.id === lessonId));
    if (!lessonExists)
        return false;
    const user = req.user;
    if (!user)
        return false;
    if (user.activeRole === 'PLATFORM_ADMIN' && user.globalRole === 'PLATFORM_SUPERADMIN')
        return true;
    if (user.activeRole === 'INSTRUCTOR')
        return course.instructorId === user.id;
    if (user.activeRole === 'INSTITUTION_ADMIN' && user.institutionId)
        return course.tenantId === user.institutionId;
    const enrollments = await dbRepository_1.repo.getEnrollmentsByLearner(user.id);
    return enrollments.some(enrollment => enrollment.courseId === courseId && enrollment.status === 'ENROLLED');
}
// Middleware supporting both Bearer JWT, query JWT, and time-bounded CDN playback tokens
async function authenticateDrmKeyRequest(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = (authHeader && authHeader.startsWith('Bearer '))
        ? authHeader.slice(7)
        : (typeof req.query.token === 'string' ? req.query.token : undefined);
    if (!token) {
        res.status(401).json({ message: 'Unauthorized: Missing encryption key token' });
        return;
    }
    const courseId = req.params.courseId;
    const lessonId = req.params.lessonId;
    // 1. Check time-bounded CDN signed playback token
    if (cdnSecurityService_1.cdnSecurityService.verifyPlaybackToken(courseId, lessonId, token)) {
        return next();
    }
    // 2. Otherwise verify user JWT session token
    try {
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
        req.user = decoded;
        if (!await hasMediaAccess(req, courseId, lessonId)) {
            res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
            return;
        }
        next();
    }
    catch {
        res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
    }
}
// GET /api/media/hls-key/:courseId/:lessonId - Authenticated DRM AES-128 Key License Broker
router.get('/hls-key/:courseId/:lessonId', (0, validate_1.validateParams)(mediaParamsSchema), authenticateDrmKeyRequest, async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const lessonId = req.params.lessonId;
        // Fetch AES-128 cryptographic key from persistence
        let drmRecord = null;
        if (dbRepository_1.repo.isMongoActive()) {
            drmRecord = await models_1.DrmKeyModel.findOne({ courseId, lessonId }).lean();
        }
        if (!drmRecord) {
            res.status(404).json({ message: 'DRM encryption key not found for specified lesson.' });
            return;
        }
        const keyBuffer = Buffer.from(drmRecord.keyHex, 'hex');
        // Strict anti-caching headers for cryptographic license delivery
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.send(keyBuffer);
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to retrieve media decryption key', error: err.message });
    }
});
// GET /api/media/playback-url/:courseId/:lessonId - Get signed playback URL with token authentication
router.get('/playback-url/:courseId/:lessonId', auth_1.requireAuth, (0, validate_1.validateParams)(mediaParamsSchema), async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const lessonId = req.params.lessonId;
        if (!await hasMediaAccess(req, courseId, lessonId)) {
            res.status(403).json({ message: 'Forbidden: Enrollment or resource ownership is required for media access.' });
            return;
        }
        const signedUrl = cdnSecurityService_1.cdnSecurityService.generateSignedPlaybackUrl({
            courseId,
            lessonId,
            validMinutes: 180, // 3 hours
        });
        res.json({
            courseId,
            lessonId,
            playbackUrl: signedUrl,
            expiresInMinutes: 180,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to generate signed playback URL', error: err.message });
    }
});
exports.default = router;
