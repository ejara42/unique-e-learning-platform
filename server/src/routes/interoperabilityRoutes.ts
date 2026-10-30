import { Router, Request, Response } from 'express';
import { interoperabilityService } from '../services/interoperabilityService';

const router = Router();

// POST /api/interoperability/lti/login - OIDC Initiation
router.post('/login', (req: Request, res: Response) => {
  try {
    const { iss, login_hint, target_link_uri } = req.body;
    if (!iss) {
      res.status(400).json({ message: 'iss (Issuer LMS) is required' });
      return;
    }

    const { authRedirectUrl, state, nonce } = interoperabilityService.initiateLtiLogin(
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
router.post('/launch', async (req: Request, res: Response) => {
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
router.post('/scorm/initialize', (req: Request, res: Response) => {
  try {
    const { sessionId, learnerId, courseId } = req.body;
    if (!learnerId || !courseId) {
      res.status(400).json({ success: false, message: 'learnerId and courseId are required' });
      return;
    }
    const session = interoperabilityService.initializeScormSession(
      sessionId || `scorm-${Date.now()}`,
      learnerId,
      courseId
    );
    res.json({ success: true, ...session });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/interoperability/scorm/:sessionId/get?element=cmi.core.lesson_status
router.get('/scorm/:sessionId/get', (req: Request, res: Response) => {
  const { element } = req.query;
  if (!element || typeof element !== 'string') {
    res.status(400).json({ success: false, errorCode: '401', message: 'element query parameter is required' });
    return;
  }

  const value = interoperabilityService.getScormValue(req.params.sessionId as string, element);
  res.json({ success: true, value });
});

// POST /api/interoperability/scorm/:sessionId/set
router.post('/scorm/:sessionId/set', (req: Request, res: Response) => {
  const { element, value } = req.body;
  if (!element || value === undefined) {
    res.status(400).json({ success: false, errorCode: '401', message: 'element and value are required in body' });
    return;
  }

  const success = interoperabilityService.setScormValue(req.params.sessionId as string, element, String(value));
  if (!success) {
    res.status(400).json({ success: false, errorCode: '405', message: 'Invalid CMI element or value out of range' });
    return;
  }
  res.json({ success: true });
});

// POST /api/interoperability/scorm/:sessionId/commit
router.post('/scorm/:sessionId/commit', async (req: Request, res: Response) => {
  try {
    const success = await interoperabilityService.commitScormSession(req.params.sessionId as string);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/interoperability/scorm/:sessionId/finish (LMSFinish / Terminate)
router.post('/scorm/:sessionId/finish', async (req: Request, res: Response) => {
  try {
    const success = await interoperabilityService.terminateScormSession(req.params.sessionId as string);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
