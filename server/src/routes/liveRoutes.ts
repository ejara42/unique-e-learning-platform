import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { repo } from '../data/dbRepository';
import { livekitService } from '../services/livekitService';
import { requireAuth, requireRole, AuthRequest } from '../middleware/auth';
import { ILiveSession } from '../types';

const router = Router();

// GET /api/live-sessions - List live sessions
router.get('/', async (req: Request, res: Response) => {
  try {
    const { courseId, status } = req.query;
    let sessions = await repo.getLiveSessions();

    if (courseId) {
      sessions = sessions.filter(s => s.courseId === courseId);
    }
    if (status) {
      sessions = sessions.filter(s => s.status === (status as string).toUpperCase());
    }

    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving live sessions', error: err.message });
  }
});

// GET /api/live-sessions/:id - Get session details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await repo.getLiveSessionById(req.params.id as string);
    if (!session) {
      res.status(404).json({ message: 'Live session not found' });
      return;
    }
    res.json({ session });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving live session', error: err.message });
  }
});

// POST /api/live-sessions/:id/token - Request real-time LiveKit WebRTC access token
router.post('/:id/token', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const session = await repo.getLiveSessionById(req.params.id as string);
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

    const roomToken = livekitService.generateToken({
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
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to mint LiveKit token', error: err.message });
  }
});

// POST /api/live-sessions/:id/join - Join live room & get WebRTC token with attendance increment
router.post('/:id/join', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const session = await repo.getLiveSessionById(req.params.id as string);
    if (!session) {
      res.status(404).json({ message: 'Live session not found' });
      return;
    }

    const updatedSession = await repo.updateLiveSession(session.id, {
      attendanceCount: (session.attendanceCount || 0) + 1
    }) || session;

    if (!req.user?.id) {
      res.status(401).json({ message: 'Unauthorized: User identity required' });
      return;
    }

    const userId = req.user.id;
    const userName = req.user.fullName || 'Participant';
    const role = req.user?.activeRole || 'STUDENT';
    const isHost = req.user?.id === session.instructorId || role === 'PLATFORM_ADMIN';

    const livekitAuth = livekitService.generateToken({
      roomName: `room-${session.id}`,
      participantIdentity: userId,
      participantName: userName,
      role,
      isHost,
    });

    // Record attendance telemetry in audit log
    await repo.createAuditLog({
      id: `log-${uuidv4().slice(0, 8)}`,
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
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to join session', error: err.message });
  }
});

// POST /api/live-sessions/:id/recording - Toggle recording state (Instructor/Admin only)
router.post('/:id/recording', requireAuth, requireRole('INSTRUCTOR', 'INSTITUTION_ADMIN', 'PLATFORM_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { action } = req.body; // 'START' | 'STOP'
    const session = await repo.getLiveSessionById(req.params.id as string);
    if (!session) {
      res.status(404).json({ message: 'Live session not found' });
      return;
    }

    const isStarting = action === 'START';
    const recordingUrl = isStarting ? `https://recordings.edusphere.io/${session.id}/master.m3u8` : undefined;
    const updatedSession = await repo.updateLiveSession(session.id, { recordingUrl }) || session;
    session.recordingUrl = updatedSession.recordingUrl;

    await repo.createAuditLog({
      id: `log-${uuidv4().slice(0, 8)}`,
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
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to update recording state', error: err.message });
  }
});

export default router;
