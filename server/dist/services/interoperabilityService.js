"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.interoperabilityService = exports.InteroperabilityService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const dbRepository_1 = require("../data/dbRepository");
const models_1 = require("../models");
class InteroperabilityService {
    ltiStateStore = new Map();
    consumedNonces = new Set();
    trustedLmsPlatforms = new Map();
    scormSessionStore = new Map();
    scormTerminatedSessions = new Set();
    STATE_TTL_MS = 15 * 60 * 1000; // 15 minutes
    // Valid SCORM 1.2 & SCORM 2004 CMI Elements
    validCmiElements = new Set([
        // SCORM 1.2
        'cmi.core.student_id',
        'cmi.core.student_name',
        'cmi.core.lesson_location',
        'cmi.core.credit',
        'cmi.core.lesson_status',
        'cmi.core.entry',
        'cmi.core.score.raw',
        'cmi.core.score.max',
        'cmi.core.score.min',
        'cmi.core.total_time',
        'cmi.core.lesson_mode',
        'cmi.core.exit',
        'cmi.core.session_time',
        'cmi.suspend_data',
        'cmi.comments',
        // SCORM 2004 3rd/4th Edition aliases
        'cmi.learner_id',
        'cmi.learner_name',
        'cmi.location',
        'cmi.completion_status',
        'cmi.success_status',
        'cmi.score.scaled',
    ]);
    validLessonStatuses = new Set([
        'passed',
        'completed',
        'failed',
        'incomplete',
        'browsed',
        'not attempted',
    ]);
    constructor() {
        // Register default trusted LMS platforms
        this.registerTrustedPlatform({
            issuer: 'https://canvas.instructure.com',
            clientId: 'edusphere_lti_client',
            publicKeyOrSecret: process.env.LTI_CANVAS_PUBLIC_KEY || 'edusphere-trusted-lms-canvas-key-2026',
        });
        this.registerTrustedPlatform({
            issuer: 'https://blackboard.edusphere.io',
            clientId: 'edusphere_lti_client',
            publicKeyOrSecret: process.env.LTI_BLACKBOARD_PUBLIC_KEY || 'edusphere-trusted-lms-bb-key-2026',
        });
        if (process.env.LTI_ISSUER) {
            this.registerTrustedPlatform({
                issuer: process.env.LTI_ISSUER,
                clientId: process.env.LTI_CLIENT_ID || 'edusphere_lti_client',
                publicKeyOrSecret: process.env.LTI_KEY || 'edusphere-trusted-lms-env-key-2026',
            });
        }
    }
    /**
     * Register a trusted LMS platform and its public key/secret
     */
    registerTrustedPlatform(platform) {
        this.trustedLmsPlatforms.set(platform.issuer, platform);
    }
    /**
     * LTI 1.3 OIDC Initiation: Stores state and nonce to prevent CSRF and replay attacks
     */
    initiateLtiLogin(iss, loginHint, targetLinkUri) {
        const state = `state_${(0, uuid_1.v4)().slice(0, 16)}`;
        const nonce = `nonce_${(0, uuid_1.v4)().slice(0, 16)}`;
        this.ltiStateStore.set(state, {
            state,
            nonce,
            iss,
            createdAt: Date.now(),
        });
        if (dbRepository_1.repo.isMongoActive()) {
            models_1.LtiStateModel.create({ state, nonce, iss }).catch(() => { });
        }
        const authRedirectUrl = `${iss}/api/lti/authorize?response_type=id_token&scope=openid&client_id=edusphere_lti_client&redirect_uri=${encodeURIComponent(targetLinkUri)}&login_hint=${encodeURIComponent(loginHint)}&state=${state}&nonce=${nonce}&prompt=none&response_mode=form_post`;
        return { authRedirectUrl, state, nonce };
    }
    /**
     * LTI 1.3 Launch Handler: Cryptographically verifies JWT signature against trusted issuer JWKS/key,
     * validates issuer, audience, client, expiration, state, nonce, and prevents replay attacks.
     */
    async processLtiLaunch(idToken, state, keyOverride) {
        if (!idToken) {
            throw new Error('id_token is required for LTI launch');
        }
        // 1. Mandatory State validation (CSRF protection)
        if (!state) {
            throw new Error('Missing required state parameter in LTI 1.3 launch. Possible CSRF attack.');
        }
        let storedState = this.ltiStateStore.get(state);
        if (!storedState && dbRepository_1.repo.isMongoActive()) {
            const doc = await models_1.LtiStateModel.findOne({ state });
            if (doc) {
                storedState = {
                    state: doc.state,
                    nonce: doc.nonce,
                    iss: doc.iss,
                    createdAt: new Date(doc.createdAt).getTime(),
                };
            }
        }
        if (!storedState) {
            throw new Error('Invalid or unrecognized LTI 1.3 state parameter. Session may not have originated from this platform.');
        }
        if (Date.now() - storedState.createdAt > this.STATE_TTL_MS) {
            this.ltiStateStore.delete(state);
            throw new Error('LTI 1.3 state parameter has expired.');
        }
        // 2. Decode unverified header/payload to resolve Header, Issuer and Audience
        const unverified = jsonwebtoken_1.default.decode(idToken, { complete: true });
        if (!unverified || !unverified.payload || !unverified.header) {
            throw new Error('Malformed LTI 1.3 id_token: could not decode JWT structure.');
        }
        const header = unverified.header;
        const payload = unverified.payload;
        const tokenIssuer = payload.iss;
        const tokenAudience = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
        // Strict algorithm enforcement per LTI 1.3 / IMS Security Framework Profile
        // Rejects 'none' and symmetric algorithms like HS256 to prevent HMAC vs RSA confusion
        const allowedAlgorithms = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'];
        if (!allowedAlgorithms.includes(header.alg)) {
            throw new Error(`Unsupported or unsafe signing algorithm: '${header.alg}'. LTI 1.3 security profile mandates asymmetric RS256/ES256.`);
        }
        // 3. Issuer Validation against Trusted LMS Registry
        const platform = this.trustedLmsPlatforms.get(tokenIssuer);
        if (!platform && !keyOverride) {
            throw new Error(`Untrusted LTI 1.3 issuer: '${tokenIssuer}'. LMS platform is not registered.`);
        }
        // 4. Audience / Client ID Validation
        const expectedClientId = platform ? platform.clientId : (process.env.LTI_CLIENT_ID || 'edusphere_lti_client');
        if (tokenAudience !== expectedClientId) {
            throw new Error(`LTI 1.3 audience mismatch. Expected client_id '${expectedClientId}', received '${tokenAudience}'.`);
        }
        // 5. Cryptographic Signature Verification & Key Rotation / Multi-instance resolution
        let verificationKey = keyOverride || null;
        if (!verificationKey && platform) {
            if (header.kid && platform.keys && platform.keys[header.kid]) {
                verificationKey = platform.keys[header.kid];
            }
            else if (platform.publicKeyOrSecret) {
                verificationKey = platform.publicKeyOrSecret;
            }
        }
        if (!verificationKey) {
            throw new Error(`No cryptographic verification key configured for issuer: ${tokenIssuer} (kid: '${header.kid || 'default'}')`);
        }
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(idToken, verificationKey, {
                algorithms: allowedAlgorithms,
                audience: expectedClientId,
                issuer: tokenIssuer,
            });
        }
        catch (err) {
            if (err.name === 'TokenExpiredError') {
                throw new Error(`LTI 1.3 id_token has expired. Expiration: ${err.expiredAt}`);
            }
            throw new Error(`LTI 1.3 JWT signature verification failed: ${err.message}`);
        }
        // 6. Nonce Validation
        if (!decoded.nonce || decoded.nonce !== storedState.nonce) {
            throw new Error('LTI 1.3 nonce mismatch. Token replay or unauthorized launch.');
        }
        // 7. Replay Protection: Consume state and record nonce (in-memory & cluster-wide atomic lock)
        if (this.consumedNonces.has(decoded.nonce)) {
            throw new Error('LTI 1.3 token has already been consumed (replay attack detected).');
        }
        if (dbRepository_1.repo.isMongoActive()) {
            try {
                await models_1.LtiConsumedNonceModel.create({ nonce: decoded.nonce, consumedAt: new Date() });
            }
            catch (err) {
                if (err.code === 11000) {
                    throw new Error('LTI 1.3 token has already been consumed (replay attack detected across cluster).');
                }
            }
            await models_1.LtiStateModel.deleteOne({ state }).catch(() => { });
        }
        this.consumedNonces.add(decoded.nonce);
        this.ltiStateStore.delete(state);
        // 8. Validate essential IMS LTI 1.3 Advantage Claims
        const messageType = decoded['https://purl.imsglobal.org/spec/lti/claim/message_type'];
        const ltiVersion = decoded['https://purl.imsglobal.org/spec/lti/claim/version'];
        const deploymentId = decoded['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
        if (messageType !== 'LtiResourceLinkRequest') {
            throw new Error(`Unsupported LTI 1.3 message_type: '${messageType}'. Must be 'LtiResourceLinkRequest'.`);
        }
        if (ltiVersion !== '1.3.0') {
            throw new Error(`Unsupported LTI version: '${ltiVersion}'. Only LTI 1.3.0 is accepted.`);
        }
        if (!deploymentId) {
            throw new Error('Missing deployment_id claim in LTI 1.3 token.');
        }
        if (!decoded.sub) {
            throw new Error('Missing sub (user subject identifier) in LTI 1.3 token.');
        }
        const context = {
            courseId: decoded['https://purl.imsglobal.org/spec/lti/claim/custom']?.course_id || 'course-1',
            userId: decoded.sub,
            roles: decoded['https://purl.imsglobal.org/spec/lti/claim/roles'] || ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
            iss: tokenIssuer,
            aud: tokenAudience,
            deploymentId,
        };
        return context;
    }
    // ==========================================================================
    // SCORM 1.2 / 2004 RUNTIME CMI STATE MACHINE
    // ==========================================================================
    /**
     * SCORM 1.2 / 2004 Runtime API: Session Initialization
     */
    initializeScormSession(sessionId, learnerId, courseId) {
        if (this.scormTerminatedSessions.has(sessionId)) {
            throw new Error('SCORM session has already terminated and cannot be reinitialized.');
        }
        const initialData = {
            'cmi.core.student_id': learnerId,
            'cmi.core.course_id': courseId,
            'cmi.core.lesson_status': 'incomplete',
            'cmi.core.lesson_location': '1',
            'cmi.core.score.raw': '0',
            'cmi.core.session_time': '00:00:00',
            'cmi.suspend_data': '',
            // SCORM 2004 aliases
            'cmi.learner_id': learnerId,
            'cmi.completion_status': 'incomplete',
        };
        this.scormSessionStore.set(sessionId, initialData);
        if (dbRepository_1.repo.isMongoActive()) {
            models_1.ScormSessionModel.findOneAndUpdate({ sessionId }, { sessionId, learnerId, courseId, cmiData: initialData, isCompleted: false }, { upsert: true, new: true }).catch(err => {
                console.warn(`[SCORM] Mongo session save warning: ${err.message}`);
            });
        }
        return { status: 'true', sessionData: initialData };
    }
    /**
     * SCORM 1.2 / 2004: Get Value (with session ownership validation)
     */
    getScormValue(sessionId, element, requestingLearnerId) {
        if (this.scormTerminatedSessions.has(sessionId)) {
            return ''; // SCORM Error 101: Session terminated
        }
        const session = this.scormSessionStore.get(sessionId);
        if (!session) {
            return ''; // SCORM Error 301: Not initialized
        }
        // Session Ownership Verification
        if (requestingLearnerId && session['cmi.core.student_id'] !== requestingLearnerId) {
            throw new Error('Forbidden: SCORM session belongs to another learner.');
        }
        return session[element] || '';
    }
    /**
     * SCORM 1.2 / 2004: Set Value (with data model & session ownership validation)
     */
    setScormValue(sessionId, element, value, requestingLearnerId) {
        if (this.scormTerminatedSessions.has(sessionId)) {
            return false; // Error: Session terminated
        }
        if (!this.validCmiElements.has(element)) {
            return false; // Error 401: Invalid CMI element
        }
        const session = this.scormSessionStore.get(sessionId);
        if (!session) {
            return false; // Error 301: Not initialized
        }
        // Session Ownership Verification
        if (requestingLearnerId && session['cmi.core.student_id'] !== requestingLearnerId) {
            throw new Error('Forbidden: Cannot modify SCORM session belonging to another learner.');
        }
        // Validate lesson_status / completion_status values
        if (element === 'cmi.core.lesson_status' || element === 'cmi.completion_status') {
            const normalizedStatus = value.toLowerCase().trim();
            if (!this.validLessonStatuses.has(normalizedStatus)) {
                return false; // Error 405: Value out of range
            }
            session[element] = normalizedStatus;
            // Mirror to SCORM 2004 alias
            if (element === 'cmi.core.lesson_status')
                session['cmi.completion_status'] = normalizedStatus;
            return true;
        }
        // Validate score.raw (numeric 0-100)
        if (element === 'cmi.core.score.raw') {
            const numeric = parseFloat(value);
            if (isNaN(numeric) || numeric < 0 || numeric > 100) {
                return false;
            }
        }
        session[element] = String(value);
        return true;
    }
    /**
     * SCORM Commit: Persists current progress
     */
    async commitScormSession(sessionId, requestingLearnerId) {
        const session = this.scormSessionStore.get(sessionId);
        if (!session)
            return false;
        if (requestingLearnerId && session['cmi.core.student_id'] !== requestingLearnerId) {
            throw new Error('Forbidden: Cannot commit SCORM session belonging to another learner.');
        }
        const learnerId = session['cmi.core.student_id'];
        const courseId = session['cmi.core.course_id'];
        const lessonStatus = session['cmi.core.lesson_status'];
        const isCompleted = lessonStatus === 'completed' || lessonStatus === 'passed';
        if (isCompleted) {
            await dbRepository_1.repo.updateProgress(courseId, learnerId, 'scorm-lesson-pkg');
        }
        if (dbRepository_1.repo.isMongoActive()) {
            try {
                await models_1.ScormSessionModel.findOneAndUpdate({ sessionId }, { cmiData: session, isCompleted }, { upsert: true });
            }
            catch (err) {
                console.warn(`[SCORM] Mongo commit error: ${err.message}`);
            }
        }
        return true;
    }
    /**
     * SCORM 1.2 LMSFinish / SCORM 2004 Terminate
     */
    async terminateScormSession(sessionId, requestingLearnerId) {
        const session = this.scormSessionStore.get(sessionId);
        if (!session)
            return false;
        if (requestingLearnerId && session['cmi.core.student_id'] !== requestingLearnerId) {
            throw new Error('Forbidden: Cannot terminate SCORM session belonging to another learner.');
        }
        // Execute final commit before termination
        await this.commitScormSession(sessionId, requestingLearnerId);
        // Mark as terminated; prevents subsequent read/writes
        this.scormTerminatedSessions.add(sessionId);
        return true;
    }
    isSessionTerminated(sessionId) {
        return this.scormTerminatedSessions.has(sessionId);
    }
}
exports.InteroperabilityService = InteroperabilityService;
exports.interoperabilityService = new InteroperabilityService();
