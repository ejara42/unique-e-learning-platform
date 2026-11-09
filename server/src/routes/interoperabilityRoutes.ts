import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { interoperabilityService } from '../services/interoperabilityService';
import { repo } from '../data/dbRepository';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import {
  emptyBodySchema,
  ltiLaunchSchema,
  ltiLoginSchema,
  scormGetQuerySchema,
  scormInitializeSchema,
  scormSessionParamsSchema,
  scormSetSchema,
} from '../validation/schemas';

const router = Router();

// POST /api/interoperability/lti/login - OIDC Initiation
router.post('/login', validateBody(ltiLoginSchema), async (req: Request, res: Response) => {
  try {
    const { iss, login_hint, target_link_uri } = req.body;
    if (!iss) {
      res.status(400).json({ message: 'iss (Issuer LMS) is required' });
      return;
    }

    const { authRedirectUrl, state, nonce } = await interoperabilityService.initiateLtiLogin(
      iss,
      login_hint || 'guest_hint',
      target_link_uri || 'http://localhost:5000/api/interoperability/launch'
    );

    res.json({
      authRedirectUrl,
      state,
      nonce,
      message: 'LTI 1.3 OIDC login initiation complete',
    });
  } catch (err: any) {
    res.status(500).json({ message: 'LTI login initiation failed', error: err.message });
  }
});

// POST /api/interoperability/lti/launch - LTI 1.3 Advantage Launch Verification (with CSRF State Validation)
router.post('/launch', validateBody(ltiLaunchSchema), async (req: Request, res: Response) => {
  try {
    const { id_token, state } = req.body;
    if (!id_token) {
      res.status(400).json({ message: 'id_token is required for LTI launch' });
      return;
    }

    const context = await interoperabilityService.processLtiLaunch(id_token, state);
    res.json({
      message: 'LTI 1.3 Advantage launch verified successfully',
      context,
      embeddedViewUrl: `http://localhost:5173/course/${context.courseId}?lti=true`,
    });
  } catch (err: any) {
    res.status(400).json({ message: 'LTI 1.3 launch verification failed', error: err.message });
  }
});

// GET /api/interoperability/jwks - Public Keyset for LMS Integration (Canvas / Blackboard / Moodle)
router.get('/jwks', (_req: Request, res: Response) => {
  res.json({
    keys: [
      {
        kty: 'RSA',
        alg: 'RS256',
        use: 'sig',
        kid: 'edusphere-lti-key-2026',
        n: 'u_edusphere_lti_rsa_modulus_sample_public_key_for_handshake',
        e: 'AQAB',
      },
    ],
  });
});

// ==============================================================================
// SCORM 1.2 / 2004 CMI Runtime API Endpoints
// ==============================================================================

// POST /api/interoperability/scorm/initialize
router.post('/scorm/initialize', requireAuth, validateBody(scormInitializeSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { sessionId, courseId } = req.body;
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Authenticated learner identity required' });
      return;
    }
    const enrollments = await repo.getEnrollmentsByLearner(req.user.id);
    if (!enrollments.some(enrollment => enrollment.courseId === courseId && enrollment.status === 'ENROLLED')) {
      res.status(403).json({ success: false, message: 'Active course enrollment is required for SCORM access.' });
      return;
    }
    const scormSessionId = sessionId || `scorm-${uuidv4()}`;
    const session = await interoperabilityService.initializeScormSession(scormSessionId, req.user.id, courseId);
    res.json({ success: true, sessionId: scormSessionId, ...session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/interoperability/scorm/:sessionId/get?element=cmi.core.lesson_status
router.get('/scorm/:sessionId/get', requireAuth, validateParams(scormSessionParamsSchema), validateQuery(scormGetQuerySchema), async (req: AuthRequest, res: Response) => {
  const { element } = req.query;
  if (!element || typeof element !== 'string') {
    res.status(400).json({ success: false, errorCode: '401', message: 'element query parameter is required' });
    return;
  }

  try {
    const value = await interoperabilityService.getScormValue(req.params.sessionId as string, element, req.user?.id);
    res.json({ success: true, value });
  } catch (err: any) {
    res.status(err.message.startsWith('Forbidden:') ? 403 : 503).json({ success: false, message: err.message });
  }
});

// POST /api/interoperability/scorm/:sessionId/set
router.post('/scorm/:sessionId/set', requireAuth, validateParams(scormSessionParamsSchema), validateBody(scormSetSchema), async (req: AuthRequest, res: Response) => {
  const { element, value } = req.body;
  if (!element || value === undefined) {
    res.status(400).json({ success: false, errorCode: '401', message: 'element and value are required in body' });
    return;
  }

  try {
    const success = await interoperabilityService.setScormValue(req.params.sessionId as string, element, String(value), req.user?.id);
    if (!success) {
      res.status(400).json({ success: false, errorCode: '405', message: 'Invalid CMI element or value out of range' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(err.message.startsWith('Forbidden:') ? 403 : 503).json({ success: false, message: err.message });
  }
});

// POST /api/interoperability/scorm/:sessionId/commit
router.post('/scorm/:sessionId/commit', requireAuth, validateParams(scormSessionParamsSchema), validateBody(emptyBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const success = await interoperabilityService.commitScormSession(req.params.sessionId as string, req.user?.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/interoperability/scorm/:sessionId/finish (LMSFinish / Terminate)
router.post('/scorm/:sessionId/finish', requireAuth, validateParams(scormSessionParamsSchema), validateBody(emptyBodySchema), async (req: AuthRequest, res: Response) => {
  try {
    const success = await interoperabilityService.terminateScormSession(req.params.sessionId as string, req.user?.id);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
