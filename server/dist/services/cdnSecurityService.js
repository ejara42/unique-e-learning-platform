"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cdnSecurityService = exports.CdnSecurityService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../config");
class CdnSecurityService {
    cdnSecret;
    cdnHostname;
    constructor() {
        const signingSecret = process.env.CDN_SIGNING_SECRET?.trim() || process.env.JWT_SECRET?.trim();
        if (config_1.config.isProduction && (!signingSecret || signingSecret.length < 32)) {
            throw new Error('[FATAL] CDN_SIGNING_SECRET must contain at least 32 characters in production.');
        }
        this.cdnSecret = signingSecret || crypto_1.default.randomBytes(32).toString('hex');
        this.cdnHostname = config_1.config.storagePublicUrl;
    }
    /**
     * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback token (Strict Max 300s TTL)
     * Encodes mandatory claims: courseId (cId), lessonId (lId), userId (uId), tokenVersion (tv), iat, exp
     */
    generatePlaybackToken(courseId, lessonId, validSeconds = 300, userId = 'anonymous', tokenVersion = 0) {
        const clampedSeconds = validSeconds <= 0 ? validSeconds : Math.min(Math.max(validSeconds, 1), 300);
        const now = Math.floor(Date.now() / 1000);
        const exp = now + clampedSeconds;
        const claims = {
            cId: courseId,
            lId: lessonId,
            uId: userId,
            tv: tokenVersion,
            iat: now,
            exp,
        };
        const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
        const signature = crypto_1.default
            .createHmac('sha256', this.cdnSecret)
            .update(claimsB64)
            .digest('base64url');
        return `${claimsB64}.${signature}`;
    }
    /**
     * Verifies an incoming HMAC-SHA256 signed playback token against course and lesson context
     * Strictly enforces cryptographic signature, claim completeness, maximum 300s lifetime, and non-expiration.
     * Returns boolean (true/false).
     */
    verifyPlaybackToken(courseId, lessonId, token) {
        if (!token || !token.includes('.'))
            return false;
        const parts = token.split('.');
        if (parts.length !== 2)
            return false;
        const [part1, part2] = parts;
        try {
            const expectedSig = crypto_1.default
                .createHmac('sha256', this.cdnSecret)
                .update(part1)
                .digest('base64url');
            if (part2.length !== expectedSig.length ||
                !crypto_1.default.timingSafeEqual(Buffer.from(part2), Buffer.from(expectedSig))) {
                return false;
            }
            const decodedStr = Buffer.from(part1, 'base64url').toString('utf8');
            const claims = JSON.parse(decodedStr);
            const now = Math.floor(Date.now() / 1000);
            // Must possess all mandatory claims
            if (!claims.cId || !claims.lId || !claims.uId || claims.tv === undefined || !claims.exp) {
                return false;
            }
            // Must not be expired
            if (claims.exp <= now)
                return false;
            // Must not exceed 300 seconds total token lifetime
            const lifetime = claims.iat ? (claims.exp - claims.iat) : (claims.exp - now);
            if (lifetime > 300 || lifetime <= 0)
                return false;
            // Course and lesson must match requested context
            if (claims.cId !== courseId || claims.lId !== lessonId)
                return false;
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Extracts and cryptographically verifies claims from structured HMAC playback token.
     * Returns PlaybackClaims or null if invalid/expired/tampered.
     */
    extractPlaybackClaims(token) {
        if (!token || !token.includes('.'))
            return null;
        const parts = token.split('.');
        if (parts.length !== 2)
            return null;
        const [part1, part2] = parts;
        try {
            const expectedSig = crypto_1.default
                .createHmac('sha256', this.cdnSecret)
                .update(part1)
                .digest('base64url');
            if (part2.length !== expectedSig.length ||
                !crypto_1.default.timingSafeEqual(Buffer.from(part2), Buffer.from(expectedSig))) {
                return null;
            }
            const claims = JSON.parse(Buffer.from(part1, 'base64url').toString('utf8'));
            if (!claims.cId || !claims.lId || !claims.uId || claims.tv === undefined || !claims.exp) {
                return null;
            }
            return claims;
        }
        catch {
            return null;
        }
    }
    /**
     * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback URL for HLS playlists
     */
    generateSignedPlaybackUrl(options) {
        const { courseId, lessonId, validMinutes = 5 } = options;
        const validSec = Math.min(Math.max(validMinutes * 60, 30), 300);
        const expires = Math.floor(Date.now() / 1000) + validSec;
        const path = `/hls/${courseId}/${lessonId}/master.m3u8`;
        const stringToSign = `${path}${expires}`;
        const token = crypto_1.default
            .createHmac('sha256', this.cdnSecret)
            .update(stringToSign)
            .digest('hex');
        return `${this.cdnHostname}${path}?token=${token}&expires=${expires}`;
    }
    /**
     * Verifies an incoming signed token request at Edge or API gateway level
     */
    verifySignedUrl(path, token, expires) {
        const now = Math.floor(Date.now() / 1000);
        if (now > expires) {
            return false;
        }
        const stringToSign = `${path}${expires}`;
        const expectedToken = crypto_1.default
            .createHmac('sha256', this.cdnSecret)
            .update(stringToSign)
            .digest('hex');
        try {
            if (token.length !== expectedToken.length)
                return false;
            return crypto_1.default.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
        }
        catch {
            return false;
        }
    }
}
exports.CdnSecurityService = CdnSecurityService;
exports.cdnSecurityService = new CdnSecurityService();
