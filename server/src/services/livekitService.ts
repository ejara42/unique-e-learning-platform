import jwt from 'jsonwebtoken';
import { UserRole } from '../types';

export interface LiveKitTokenOptions {
  roomName: string;
  participantIdentity: string;
  participantName: string;
  role: UserRole;
  isHost?: boolean;
  metadata?: Record<string, any>;
}

export interface LiveKitTelemetry {
  configured: boolean;
  reachable: boolean;
  mode: 'LIVE_SFU_CLUSTER' | 'STANDALONE_TOKEN_MINTER';
  wsUrl: string;
  keyConfigured: boolean;
  details: string;
}

export class LiveKitService {
  private apiKey: string;
  private apiSecret: string;
  public wsUrl: string;

  constructor() {
    this.apiKey = process.env.LIVEKIT_API_KEY || 'devkey_edusphere_webrtc_2026';
    this.apiSecret = process.env.LIVEKIT_API_SECRET || 'devsecret_9823471092834710293847';
    this.wsUrl = process.env.LIVEKIT_URL || 'wss://livekit.edusphere.io';
  }

  /**
   * Generates standard LiveKit WebRTC Room Access Token
   */
  generateToken(options: LiveKitTokenOptions): { token: string; wsUrl: string; expiresAt: string } {
    const { roomName, participantIdentity, participantName, role, isHost } = options;

    const isPrivileged = isHost || role === 'INSTRUCTOR' || role === 'PLATFORM_ADMIN' || role === 'INSTITUTION_ADMIN';

    // LiveKit Video Grants payload
    const videoGrant: Record<string, any> = {
      room: roomName,
      roomJoin: true,
      canSubscribe: true,
      canPublishData: true, // chat and telemetry
      canPublish: true,     // video and audio
    };

    if (isPrivileged) {
      videoGrant.roomAdmin = true;
      videoGrant.roomCreate = true;
      videoGrant.canPublishSources = ['camera', 'microphone', 'screen_share', 'screen_share_audio'];
    } else {
      videoGrant.canPublishSources = ['camera', 'microphone'];
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const ttlSeconds = 6 * 3600; // 6 hours
    const expiresAtSeconds = nowSeconds + ttlSeconds;

    const payload = {
      iss: this.apiKey,
      sub: participantIdentity,
      name: participantName,
      video: videoGrant,
      metadata: JSON.stringify({
        role,
        isHost: Boolean(isHost),
        ...options.metadata,
      }),
      nbf: nowSeconds - 10,
      exp: expiresAtSeconds,
    };

    const token = jwt.sign(payload, this.apiSecret, { algorithm: 'HS256' });

    return {
      token,
      wsUrl: this.wsUrl,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
    };
  }

  /**
   * Verifies incoming LiveKit webhook or token
   */
  verifyToken(token: string): any {
    return jwt.verify(token, this.apiSecret);
  }

  /**
   * Real-time Connectivity Telemetry
   * Distinguishes cryptographic token generation from actual live SFU server reachability
   */
  async getTelemetry(): Promise<LiveKitTelemetry> {
    const isConfigured = Boolean(process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET && process.env.LIVEKIT_URL);
    let reachable = false;

    // Convert wss:// to https:// to probe HTTP health/status if configured
    if (isConfigured && this.wsUrl) {
      try {
        const httpUrl = this.wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(httpUrl, { signal: controller.signal });
        clearTimeout(timeout);
        reachable = res.status < 500;
      } catch {
        reachable = false;
      }
    }

    return {
      configured: isConfigured,
      reachable,
      mode: reachable ? 'LIVE_SFU_CLUSTER' : 'STANDALONE_TOKEN_MINTER',
      wsUrl: this.wsUrl,
      keyConfigured: Boolean(this.apiKey),
      details: reachable
        ? 'LiveKit SFU cluster is connected and actively routing WebRTC media.'
        : 'LiveKit server is offline or unreachable; operating in cryptographic token generation mode (media transfer requires running SFU).',
    };
  }
}

export const livekitService = new LiveKitService();
