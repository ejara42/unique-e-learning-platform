import crypto from 'crypto';
import { config } from '../config';

export interface CdnSignedUrlOptions {
  courseId: string;
  lessonId: string;
  validMinutes?: number;
  clientIp?: string;
}

export interface PlaybackClaims {
  cId: string; // courseId
  lId: string; // lessonId
  uId: string; // userId
  tv: number;  // tokenVersion
  iat: number; // issued at (unix timestamp seconds)
  exp: number; // expires at (unix timestamp seconds, max 300s lifetime)
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
   * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback token (Strict Max 300s TTL)
   * Encodes mandatory claims: courseId (cId), lessonId (lId), userId (uId), tokenVersion (tv), iat, exp
   */
  public generatePlaybackToken(
    courseId: string,
    lessonId: string,
    validSeconds = 300,
    userId = 'anonymous',
    tokenVersion = 0
  ): string {
    const clampedSeconds = validSeconds <= 0 ? validSeconds : Math.min(Math.max(validSeconds, 1), 300);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + clampedSeconds;
    const claims: PlaybackClaims = {
      cId: courseId,
      lId: lessonId,
      uId: userId,
      tv: tokenVersion,
      iat: now,
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
   * Verifies an incoming HMAC-SHA256 signed playback token against course and lesson context
   * Strictly enforces cryptographic signature, claim completeness, maximum 300s lifetime, and non-expiration.
   * Returns boolean (true/false).
   */
  public verifyPlaybackToken(courseId: string, lessonId: string, token: string): boolean {
    if (!token || !token.includes('.')) return false;
    const parts = token.split('.');
    if (parts.length !== 2) return false;

    const [part1, part2] = parts;

    try {
      const expectedSig = crypto
        .createHmac('sha256', this.cdnSecret)
        .update(part1)
        .digest('base64url');

      if (
        part2.length !== expectedSig.length ||
        !crypto.timingSafeEqual(Buffer.from(part2), Buffer.from(expectedSig))
      ) {
        return false;
      }

      const decodedStr = Buffer.from(part1, 'base64url').toString('utf8');
      const claims = JSON.parse(decodedStr) as PlaybackClaims;
      const now = Math.floor(Date.now() / 1000);

      // Must possess all mandatory claims
      if (!claims.cId || !claims.lId || !claims.uId || claims.tv === undefined || !claims.exp) {
        return false;
      }

      // Must not be expired
      if (claims.exp <= now) return false;

      // Must not exceed 300 seconds total token lifetime
      const lifetime = claims.iat ? (claims.exp - claims.iat) : (claims.exp - now);
      if (lifetime > 300 || lifetime <= 0) return false;

      // Course and lesson must match requested context
      if (claims.cId !== courseId || claims.lId !== lessonId) return false;

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Extracts and cryptographically verifies claims from structured HMAC playback token.
   * Returns PlaybackClaims or null if invalid/expired/tampered.
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
        part2.length !== expectedSig.length ||
        !crypto.timingSafeEqual(Buffer.from(part2), Buffer.from(expectedSig))
      ) {
        return null;
      }

      const claims = JSON.parse(Buffer.from(part1, 'base64url').toString('utf8')) as PlaybackClaims;
      if (!claims.cId || !claims.lId || !claims.uId || claims.tv === undefined || !claims.exp) {
        return null;
      }

      return claims;
    } catch {
      return null;
    }
  }

  /**
   * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback URL for HLS playlists
   */
  public generateSignedPlaybackUrl(options: CdnSignedUrlOptions): string {
    const { courseId, lessonId, validMinutes = 5 } = options;
    const validSec = Math.min(Math.max(validMinutes * 60, 30), 300);
    const expires = Math.floor(Date.now() / 1000) + validSec;
    const path = `/hls/${courseId}/${lessonId}/master.m3u8`;

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
      return false;
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
