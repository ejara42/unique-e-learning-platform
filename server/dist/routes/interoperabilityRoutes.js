"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const interoperabilityService_1 = require("../services/interoperabilityService");
const dbRepository_1 = require("../data/dbRepository");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const schemas_1 = require("../validation/schemas");
const router = (0, express_1.Router)();
// POST /api/interoperability/lti/login - OIDC Initiation
router.post('/login', (0, validate_1.validateBody)(schemas_1.ltiLoginSchema), async (req, res) => {
    try {
        const { iss, login_hint, target_link_uri } = req.body;
        if (!iss) {
            res.status(400).json({ message: 'iss (Issuer LMS) is required' });
            return;
        }
        const { authRedirectUrl, state, nonce } = await interoperabilityService_1.interoperabilityService.initiateLtiLogin(iss, login_hint || 'guest_hint', target_link_uri || 'http://localhost:5000/api/interoperability/launch');
        res.json({
            authRedirectUrl,
            state,
            nonce,
            message: 'LTI 1.3 OIDC login initiation complete',
        });
    }
    catch (err) {
        res.status(500).json({ message: 'LTI login initiation failed', error: err.message });
    }
});
// POST /api/interoperability/lti/launch - LTI 1.3 Advantage Launch Verification (with CSRF State Validation)
router.post('/launch', (0, validate_1.validateBody)(schemas_1.ltiLaunchSchema), async (req, res) => {
    try {
        const { id_token, state } = req.body;
        if (!id_token) {
            res.status(400).json({ message: 'id_token is required for LTI launch' });
            return;
        }
        const context = await interoperabilityService_1.interoperabilityService.processLtiLaunch(id_token, state);
        res.json({
            message: 'LTI 1.3 Advantage launch verified successfully',
            context,
            embeddedViewUrl: `http://localhost:5173/course/${context.courseId}?lti=true`,
        });
    }
    catch (err) {
        res.status(400).json({ message: 'LTI 1.3 launch verification failed', error: err.message });
    }
});
// GET /api/interoperability/jwks - Public Keyset for LMS Integration (Canvas / Blackboard / Moodle)
router.get('/jwks', (_req, res) => {
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
router.post('/scorm/initialize', auth_1.requireAuth, (0, validate_1.validateBody)(schemas_1.scormInitializeSchema), async (req, res) => {
    try {
        const { sessionId, courseId } = req.body;
        if (!req.user?.id) {
            res.status(401).json({ success: false, message: 'Authenticated learner identity required' });
            return;
        }
        const enrollments = await dbRepository_1.repo.getEnrollmentsByLearner(req.user.id);
        if (!enrollments.some(enrollment => enrollment.courseId === courseId && enrollment.status === 'ENROLLED')) {
            res.status(403).json({ success: false, message: 'Active course enrollment is required for SCORM access.' });
            return;
        }
        const scormSessionId = sessionId || `scorm-${(0, uuid_1.v4)()}`;
        const session = await interoperabilityService_1.interoperabilityService.initializeScormSession(scormSessionId, req.user.id, courseId);
        res.json({ success: true, sessionId: scormSessionId, ...session });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// GET /api/interoperability/scorm/:sessionId/get?element=cmi.core.lesson_status
router.get('/scorm/:sessionId/get', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.scormSessionParamsSchema), (0, validate_1.validateQuery)(schemas_1.scormGetQuerySchema), async (req, res) => {
    const { element } = req.query;
    if (!element || typeof element !== 'string') {
        res.status(400).json({ success: false, errorCode: '401', message: 'element query parameter is required' });
        return;
    }
    try {
        const value = await interoperabilityService_1.interoperabilityService.getScormValue(req.params.sessionId, element, req.user?.id);
        res.json({ success: true, value });
    }
    catch (err) {
        res.status(err.message.startsWith('Forbidden:') ? 403 : 503).json({ success: false, message: err.message });
    }
});
// POST /api/interoperability/scorm/:sessionId/set
router.post('/scorm/:sessionId/set', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.scormSessionParamsSchema), (0, validate_1.validateBody)(schemas_1.scormSetSchema), async (req, res) => {
    const { element, value } = req.body;
    if (!element || value === undefined) {
        res.status(400).json({ success: false, errorCode: '401', message: 'element and value are required in body' });
        return;
    }
    try {
        const success = await interoperabilityService_1.interoperabilityService.setScormValue(req.params.sessionId, element, String(value), req.user?.id);
        if (!success) {
            res.status(400).json({ success: false, errorCode: '405', message: 'Invalid CMI element or value out of range' });
            return;
        }
        res.json({ success: true });
    }
    catch (err) {
        res.status(err.message.startsWith('Forbidden:') ? 403 : 503).json({ success: false, message: err.message });
    }
});
// POST /api/interoperability/scorm/:sessionId/commit
router.post('/scorm/:sessionId/commit', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.scormSessionParamsSchema), (0, validate_1.validateBody)(schemas_1.emptyBodySchema), async (req, res) => {
    try {
        const success = await interoperabilityService_1.interoperabilityService.commitScormSession(req.params.sessionId, req.user?.id);
        res.json({ success });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// POST /api/interoperability/scorm/:sessionId/finish (LMSFinish / Terminate)
router.post('/scorm/:sessionId/finish', auth_1.requireAuth, (0, validate_1.validateParams)(schemas_1.scormSessionParamsSchema), (0, validate_1.validateBody)(schemas_1.emptyBodySchema), async (req, res) => {
    try {
        const success = await interoperabilityService_1.interoperabilityService.terminateScormSession(req.params.sessionId, req.user?.id);
        res.json({ success });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.default = router;
