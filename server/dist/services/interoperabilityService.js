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
const mongoConnection_1 = require("../data/mongoConnection");
class InteroperabilityService {
    trustedLmsPlatforms = new Map();
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
        if (process.env.LTI_ISSUER && process.env.LTI_CLIENT_ID && process.env.LTI_PUBLIC_KEY) {
            this.registerTrustedPlatform({
                issuer: process.env.LTI_ISSUER,
                clientId: process.env.LTI_CLIENT_ID,
                publicKeyOrSecret: process.env.LTI_PUBLIC_KEY,
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
    async initiateLtiLogin(iss, loginHint, targetLinkUri) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB persistence is required for LTI state and replay protection.');
        const platform = this.trustedLmsPlatforms.get(iss);
        if (!platform)
            throw new Error(`Untrusted LTI 1.3 issuer: '${iss}'. LMS platform is not registered.`);
        const state = `state_${(0, uuid_1.v4)().slice(0, 16)}`;
        const nonce = `nonce_${(0, uuid_1.v4)().slice(0, 16)}`;
        await models_1.LtiStateModel.create({ state, nonce, iss });
        const authRedirectUrl = `${iss}/api/lti/authorize?response_type=id_token&scope=openid&client_id=${encodeURIComponent(platform.clientId)}&redirect_uri=${encodeURIComponent(targetLinkUri)}&login_hint=${encodeURIComponent(loginHint)}&state=${state}&nonce=${nonce}&prompt=none&response_mode=form_post`;
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
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB persistence is required for LTI state and replay protection.');
        const storedState = (await models_1.LtiStateModel.findOne({ state }).lean());
        if (!storedState) {
            throw new Error('Invalid or unrecognized LTI 1.3 state parameter. Session may not have originated from this platform.');
        }
        if (Date.now() - storedState.createdAt > this.STATE_TTL_MS) {
            await models_1.LtiStateModel.deleteOne({ state });
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
        if (storedState.iss !== tokenIssuer) {
            throw new Error('LTI 1.3 state issuer does not match the token issuer.');
        }
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
        const expectedClientId = platform?.clientId;
        if (!expectedClientId)
            throw new Error(`No LTI client ID configured for issuer: ${tokenIssuer}`);
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
        // 7. Replay Protection: Consume state and record nonce in the durable ledger.
        if (await models_1.LtiConsumedNonceModel.exists({ nonce: decoded.nonce })) {
            throw new Error('LTI 1.3 token has already been consumed (replay attack detected).');
        }
        try {
            await models_1.LtiConsumedNonceModel.create({ nonce: decoded.nonce, consumedAt: new Date() });
        }
        catch (err) {
            if (err.code === 11000) {
                throw new Error('LTI 1.3 token has already been consumed (replay attack detected across cluster).');
            }
            throw err;
        }
        await models_1.LtiStateModel.deleteOne({ state });
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
    async initializeScormSession(sessionId, learnerId, courseId) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB persistence is required for SCORM sessions.');
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
        const existing = await models_1.ScormSessionModel.findOne({ sessionId });
        if (existing) {
            if (existing.learnerId !== learnerId || existing.courseId !== courseId) {
                throw new Error('Forbidden: SCORM session belongs to another learner or course.');
            }
            if (existing.isTerminated)
                throw new Error('SCORM session has already terminated and cannot be reinitialized.');
            const sessionData = existing.cmiData instanceof Map ? Object.fromEntries(existing.cmiData) : existing.cmiData;
            return { status: 'true', sessionData };
        }
        await models_1.ScormSessionModel.create({
            sessionId,
            learnerId,
            courseId,
            cmiData: initialData,
            isCompleted: false,
            isTerminated: false,
        });
        return { status: 'true', sessionData: initialData };
    }
    /**
     * SCORM 1.2 / 2004: Get Value (with session ownership validation)
     */
    async getScormValue(sessionId, element, requestingLearnerId) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB persistence is required for SCORM sessions.');
        const doc = await models_1.ScormSessionModel.findOne({ sessionId }).lean();
        if (!doc || doc.isTerminated)
            return '';
        const session = doc.cmiData instanceof Map ? Object.fromEntries(doc.cmiData) : doc.cmiData;
        // Session Ownership Verification
        if (requestingLearnerId && doc.learnerId !== requestingLearnerId) {
            throw new Error('Forbidden: SCORM session belongs to another learner.');
        }
        return session[element] || '';
    }
    /**
     * SCORM 1.2 / 2004: Set Value (with data model & session ownership validation)
     */
    async setScormValue(sessionId, element, value, requestingLearnerId) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB persistence is required for SCORM sessions.');
        if (!this.validCmiElements.has(element)) {
            return false; // Error 401: Invalid CMI element
        }
        const doc = await models_1.ScormSessionModel.findOne({ sessionId });
        if (!doc || doc.isTerminated)
            return false;
        const session = doc.cmiData instanceof Map ? Object.fromEntries(doc.cmiData) : { ...doc.cmiData };
        // Session Ownership Verification
        if (requestingLearnerId && doc.learnerId !== requestingLearnerId) {
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
            doc.cmiData = session;
            doc.isCompleted = normalizedStatus === 'completed' || normalizedStatus === 'passed';
            await doc.save();
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
        doc.cmiData = session;
        await doc.save();
        return true;
    }
    /**
     * SCORM Commit: Persists current progress
     */
    async commitScormSession(sessionId, requestingLearnerId) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB persistence is required for SCORM sessions.');
        const doc = await models_1.ScormSessionModel.findOne({ sessionId });
        if (!doc || doc.isTerminated)
            return false;
        const session = doc.cmiData instanceof Map ? Object.fromEntries(doc.cmiData) : doc.cmiData;
        if (requestingLearnerId && doc.learnerId !== requestingLearnerId) {
            throw new Error('Forbidden: Cannot commit SCORM session belonging to another learner.');
        }
        const learnerId = session['cmi.core.student_id'];
        const courseId = session['cmi.core.course_id'];
        const lessonStatus = session['cmi.core.lesson_status'];
        const isCompleted = lessonStatus === 'completed' || lessonStatus === 'passed';
        if (isCompleted) {
            await dbRepository_1.repo.updateProgress(courseId, learnerId, 'scorm-lesson-pkg');
        }
        await models_1.ScormSessionModel.findOneAndUpdate({ sessionId, isTerminated: false }, { cmiData: session, isCompleted });
        return true;
    }
    /**
     * SCORM 1.2 LMSFinish / SCORM 2004 Terminate
     */
    async terminateScormSession(sessionId, requestingLearnerId) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB persistence is required for SCORM sessions.');
        const session = await models_1.ScormSessionModel.findOne({ sessionId });
        if (!session || session.isTerminated)
            return false;
        if (requestingLearnerId && session.learnerId !== requestingLearnerId) {
            throw new Error('Forbidden: Cannot terminate SCORM session belonging to another learner.');
        }
        // Execute final commit before termination
        await this.commitScormSession(sessionId, requestingLearnerId);
        // Mark as terminated; prevents subsequent read/writes
        const result = await models_1.ScormSessionModel.updateOne({ sessionId, isTerminated: false }, { isTerminated: true });
        return result.modifiedCount === 1;
    }
    async isSessionTerminated(sessionId) {
        if (!mongoConnection_1.connectionState.isConnected)
            throw new Error('MongoDB persistence is required for SCORM sessions.');
        const session = await models_1.ScormSessionModel.findOne({ sessionId }).select('isTerminated').lean();
        return session?.isTerminated ?? false;
    }
}
exports.InteroperabilityService = InteroperabilityService;
exports.interoperabilityService = new InteroperabilityService();
