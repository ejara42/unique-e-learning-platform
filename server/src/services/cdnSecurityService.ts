import crypto from 'crypto';

export interface CdnSignedUrlOptions {
  courseId: string;
  lessonId: string;
  validMinutes?: number;
  clientIp?: string;
}

export class CdnSecurityService {
  private cdnSecret: string;
  private cdnHostname: string;

  constructor() {
    this.cdnSecret = process.env.CDN_SIGNING_SECRET || 'edusphere-cdn-secret-key-2026';
    this.cdnHostname = (process.env.CDN_HOSTNAME || 'https://stream.edusphere.io').replace(/\/+$/, '');
  }

  /**
   * Generates a tamper-proof time-bounded HMAC-SHA256 signed playback token
   */
  public generatePlaybackToken(courseId: string, lessonId: string, validMinutes = 120): string {
    const expires = Math.floor(Date.now() / 1000) + validMinutes * 60;
    const path = `/hls/${courseId}/${lessonId}/master.m3u8`;
    const stringToSign = `${path}${expires}`;
    const hmac = crypto
      .createHmac('sha256', this.cdnSecret)
      .update(stringToSign)
      .digest('hex');
    return `${hmac}.${expires}`;
  }

  /**
   * Verifies a standalone signed playback token against course and lesson context
   */
  public verifyPlaybackToken(courseId: string, lessonId: string, token: string): boolean {
    if (!token || !token.includes('.')) return false;
    const [hmac, expiresStr] = token.split('.');
    const expires = parseInt(expiresStr, 10);
    if (isNaN(expires)) return false;
    const path = `/hls/${courseId}/${lessonId}/master.m3u8`;
    return this.verifySignedUrl(path, hmac, expires);
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
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
    } catch {
      return false;
    }
  }
}

export const cdnSecurityService = new CdnSecurityService();
