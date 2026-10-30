"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const dbRepository_1 = require("../data/dbRepository");
const livekitService_1 = require("../services/livekitService");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// GET /api/live-sessions - List live sessions
router.get('/', async (req, res) => {
    try {
        const { courseId, status } = req.query;
        let sessions = await dbRepository_1.repo.getLiveSessions();
        if (courseId) {
            sessions = sessions.filter(s => s.courseId === courseId);
        }
        if (status) {
            sessions = sessions.filter(s => s.status === status.toUpperCase());
        }
        res.json({ sessions });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving live sessions', error: err.message });
    }
});
// GET /api/live-sessions/:id - Get session details
router.get('/:id', async (req, res) => {
    try {
        const session = await dbRepository_1.repo.getLiveSessionById(req.params.id);
        if (!session) {
            res.status(404).json({ message: 'Live session not found' });
            return;
        }
        res.json({ session });
    }
    catch (err) {
        res.status(500).json({ message: 'Error retrieving live session', error: err.message });
    }
});
// POST /api/live-sessions/:id/token - Request real-time LiveKit WebRTC access token
router.post('/:id/token', auth_1.requireAuth, async (req, res) => {
    try {
        const session = await dbRepository_1.repo.getLiveSessionById(req.params.id);
        if (!session) {
            res.status(404).json({ message: 'Live session not found' });
            return;
        }
        if (!req.user?.id) {
            res.status(401).json({ message: 'Unauthorized: User identity required' });
            return;
        }
        const userId = req.user.id;
        const userName = req.user.fullName || 'Participant';
        const role = req.user?.activeRole || 'STUDENT';
        const isHost = req.user?.id === session.instructorId || role === 'PLATFORM_ADMIN';
        const roomToken = livekitService_1.livekitService.generateToken({
            roomName: `room-${session.id}`,
            participantIdentity: userId,
            participantName: userName,
            role,
            isHost,
            metadata: {
                sessionId: session.id,
                courseTitle: session.courseTitle,
            },
        });
        res.json({
            message: 'LiveKit token successfully minted',
            ...roomToken,
            roomName: `room-${session.id}`,
            participant: {
                id: userId,
                name: userName,
                role,
                isHost,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to mint LiveKit token', error: err.message });
    }
});
// POST /api/live-sessions/:id/join - Join live room & get WebRTC token with attendance increment
router.post('/:id/join', auth_1.requireAuth, async (req, res) => {
    try {
        const session = await dbRepository_1.repo.getLiveSessionById(req.params.id);
        if (!session) {
            res.status(404).json({ message: 'Live session not found' });
            return;
        }
        session.attendanceCount += 1;
        if (!req.user?.id) {
            res.status(401).json({ message: 'Unauthorized: User identity required' });
            return;
        }
        const userId = req.user.id;
        const userName = req.user.fullName || 'Participant';
        const role = req.user?.activeRole || 'STUDENT';
        const isHost = req.user?.id === session.instructorId || role === 'PLATFORM_ADMIN';
        const livekitAuth = livekitService_1.livekitService.generateToken({
            roomName: `room-${session.id}`,
            participantIdentity: userId,
            participantName: userName,
            role,
            isHost,
        });
        // Record attendance telemetry in audit log
        await dbRepository_1.repo.createAuditLog({
            id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: null,
            actorId: userId,
            actorName: userName,
            actorRole: role,
            action: 'LIVE_CLASS_JOIN',
            resourceType: 'LIVE_SESSION',
            resourceId: session.id,
            details: `Joined session ${session.title}. Total attendance: ${session.attendanceCount}`,
            ipAddress: req.ip || '127.0.0.1',
            timestamp: new Date().toISOString(),
        });
        res.json({
            message: 'Authorized to enter live classroom via LiveKit WebRTC SFU',
            session,
            ...livekitAuth,
            participant: {
                id: userId,
                name: userName,
                role,
                isHost,
            },
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to join session', error: err.message });
    }
});
// POST /api/live-sessions/:id/recording - Toggle recording state (Instructor/Admin only)
router.post('/:id/recording', auth_1.requireAuth, (0, auth_1.requireRole)('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), async (req, res) => {
    try {
        const { action } = req.body; // 'START' | 'STOP'
        const session = await dbRepository_1.repo.getLiveSessionById(req.params.id);
        if (!session) {
            res.status(404).json({ message: 'Live session not found' });
            return;
        }
        const isStarting = action === 'START';
        if (isStarting) {
            session.recordingUrl = `https://recordings.edusphere.io/${session.id}/master.m3u8`;
        }
        await dbRepository_1.repo.createAuditLog({
            id: `log-${(0, uuid_1.v4)().slice(0, 8)}`,
            tenantId: null,
            actorId: req.user?.id || 'host',
            actorName: req.user?.fullName || 'Session Host',
            actorRole: req.user?.activeRole || 'INSTRUCTOR',
            action: `LIVE_RECORDING_${action}`,
            resourceType: 'LIVE_SESSION',
            resourceId: session.id,
            details: `Session recording ${isStarting ? 'started' : 'stopped'}. Target: ${session.recordingUrl || 'N/A'}`,
            ipAddress: req.ip || '127.0.0.1',
            timestamp: new Date().toISOString(),
        });
        res.json({
            message: `Live stream recording ${isStarting ? 'initiated' : 'stopped'} successfully.`,
            recordingActive: isStarting,
            recordingUrl: session.recordingUrl,
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Failed to update recording state', error: err.message });
    }
});
exports.default = router;
