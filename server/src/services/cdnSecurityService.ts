import crypto from 'crypto';
import { config } from '../config';

export interface CdnSignedUrlOptions {
  courseId: string;
  lessonId: string;
  validMinutes?: number;
  clientIp?: string;
}

export interface PlaybackClaims {
  cId: string;
  lId: string;
  uId?: string;
  tv?: number;
  exp: number;
}

export class CdnSecurityService {
  private cdnSecret: string;
  private cdnHostname: string;

  constructor() {
    const signingSecret = process.env.CDN_SIGNING_SECRET?.trim() || process.env.JWT_SECRET?.trim();
    if (config.isProduction && (!signingSecret || signingSecret.length < 32)) {
      throw new Error('[FATAL] CDN_SIGNING_SECRET must contain at least 32 characters in production.');
    }
    this.cdnSecret = signingSecret || crypto.randomBytes(32).toString('hex');
    this.cdnHostname = config.storagePublicUrl;
  }

  /**
   * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback token (Max 300s TTL)
   * Encodes minimal claims: courseId (cId), lessonId (lId), userId (uId), tokenVersion (tv), exp
   */
  public generatePlaybackToken(
    courseId: string,
    lessonId: string,
    validMinutes = 5,
    userId?: string,
    tokenVersion?: number
  ): string {
    const validSeconds = Math.min(Math.max(validMinutes * 60, 30), 300); // 30s to 300s max
    const exp = Math.floor(Date.now() / 1000) + validSeconds;
    const claims: PlaybackClaims = {
      cId: courseId,
      lId: lessonId,
      uId: userId,
      tv: tokenVersion,
      exp,
    };
    const claimsB64 = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.cdnSecret)
      .update(claimsB64)
      .digest('base64url');
    return `${claimsB64}.${signature}`;
  }

  /**
   * Verifies a standalone signed playback token against course and lesson context
   * Returns boolean (true/false) for strict equality compatibility
   */
  public verifyPlaybackToken(courseId: string, lessonId: string, token: string): boolean {
    if (!token || !token.includes('.')) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [part1, part2] = parts;

    // Check for Structured Claims Token (part1 is base64url JSON)
    try {
      const expectedSig = crypto
        .createHmac('sha256', this.cdnSecret)
        .update(part1)
        .digest('base64url');

      if (
        part2.length === expectedSig.length &&
        crypto.timingSafeEqual(Buffer.from(part2), Buffer.from(expectedSig))
      ) {
        const decodedStr = Buffer.from(part1, 'base64url').toString('utf8');
        const claims = JSON.parse(decodedStr) as PlaybackClaims;
        const now = Math.floor(Date.now() / 1000);

        if (claims.exp <= now || claims.exp > now + 3600) return false;
        if (claims.cId !== courseId || claims.lId !== lessonId) return false;
        return true;
      }
    } catch {
      // Fall through to legacy format
    }

    // Fallback: Legacy simple format: ${hmac}.${expires}
    const [hmac, expiresStr] = parts;
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (expires <= now || expires > now + 24 * 60 * 60) return false;
    const path = `/hls/${courseId}/${lessonId}/master.m3u8`;
    return this.verifySignedUrl(path, hmac, expires);
  }

  /**
   * Extracts and verifies claims from structured HMAC playback token
   */
  public extractPlaybackClaims(token: string): PlaybackClaims | null {
    if (!token || !token.includes('.')) return null;
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [part1, part2] = parts;

    try {
      const expectedSig = crypto
        .createHmac('sha256', this.cdnSecret)
        .update(part1)
        .digest('base64url');

      if (
        part2.length === expectedSig.length &&
        crypto.timingSafeEqual(Buffer.from(part2), Buffer.from(expectedSig))
      ) {
        return JSON.parse(Buffer.from(part1, 'base64url').toString('utf8')) as PlaybackClaims;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback URL for HLS playlists
   * Compatible with Cloudflare Token Authentication / Edge Worker URL Validation
   */
  public generateSignedPlaybackUrl(options: CdnSignedUrlOptions): string {
    const { courseId, lessonId, validMinutes = 120 } = options;
    const expires = Math.floor(Date.now() / 1000) + validMinutes * 60;
    const path = `/hls/${courseId}/${lessonId}/master.m3u8`;

    // String to sign: path + expires
    const stringToSign = `${path}${expires}`;
    const token = crypto
      .createHmac('sha256', this.cdnSecret)
      .update(stringToSign)
      .digest('hex');

    return `${this.cdnHostname}${path}?token=${token}&expires=${expires}`;
  }

  /**
   * Verifies an incoming signed token request at Edge or API gateway level
   */
  public verifySignedUrl(path: string, token: string, expires: number): boolean {
    const now = Math.floor(Date.now() / 1000);
    if (now > expires) {
      return false; // Token has expired
    }

    const stringToSign = `${path}${expires}`;
    const expectedToken = crypto
      .createHmac('sha256', this.cdnSecret)
      .update(stringToSign)
      .digest('hex');

    try {
      if (token.length !== expectedToken.length) return false;
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
    } catch {
      return false;
    }
  }
}

export const cdnSecurityService = new CdnSecurityService();
