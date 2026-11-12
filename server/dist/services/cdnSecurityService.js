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
     * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback token (Max 300s TTL)
     * Encodes minimal claims: courseId (cId), lessonId (lId), userId (uId), tokenVersion (tv), exp
     */
    generatePlaybackToken(courseId, lessonId, validMinutes = 5, userId, tokenVersion) {
        const validSeconds = Math.min(Math.max(validMinutes * 60, 30), 300); // 30s to 300s max
        const exp = Math.floor(Date.now() / 1000) + validSeconds;
        const claims = {
            cId: courseId,
            lId: lessonId,
            uId: userId,
            tv: tokenVersion,
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
     * Verifies a standalone signed playback token against course and lesson context
     * Supports structured claims token (base64url) and legacy HMAC.expiry tokens
     */
    verifyPlaybackToken(courseId, lessonId, token) {
        if (!token || !token.includes('.'))
            return false;
        const parts = token.split('.');
        if (parts.length !== 2)
            return false;
        const [part1, part2] = parts;
        // Check for Structured Claims Token (part1 is base64url JSON)
        try {
            const expectedSig = crypto_1.default
                .createHmac('sha256', this.cdnSecret)
                .update(part1)
                .digest('base64url');
            if (part2.length === expectedSig.length &&
                crypto_1.default.timingSafeEqual(Buffer.from(part2), Buffer.from(expectedSig))) {
                const decodedStr = Buffer.from(part1, 'base64url').toString('utf8');
                const claims = JSON.parse(decodedStr);
                const now = Math.floor(Date.now() / 1000);
                if (claims.exp <= now || claims.exp > now + 3600)
                    return false;
                if (claims.cId !== courseId || claims.lId !== lessonId)
                    return false;
                return claims;
            }
        }
        catch {
            // Fall through to legacy format
        }
        // Fallback: Legacy simple format: ${hmac}.${expires}
        const [hmac, expiresStr] = parts;
        const expires = parseInt(expiresStr, 10);
        if (isNaN(expires))
            return false;
        const now = Math.floor(Date.now() / 1000);
        if (expires <= now || expires > now + 24 * 60 * 60)
            return false;
        const path = `/hls/${courseId}/${lessonId}/master.m3u8`;
        return this.verifySignedUrl(path, hmac, expires);
    }
    /**
     * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback URL for HLS playlists
     * Compatible with Cloudflare Token Authentication / Edge Worker URL Validation
     */
    generateSignedPlaybackUrl(options) {
        const { courseId, lessonId, validMinutes = 120 } = options;
        const expires = Math.floor(Date.now() / 1000) + validMinutes * 60;
        const path = `/hls/${courseId}/${lessonId}/master.m3u8`;
        // String to sign: path + expires
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
            return false; // Token has expired
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
