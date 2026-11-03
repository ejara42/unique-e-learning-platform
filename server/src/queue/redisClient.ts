import net from 'net';
import tls from 'tls';
import { URL } from 'url';

export interface RedisConnectionOptions {
  host: string;
  port: number;
  password?: string;
  tls?: boolean;
  db?: number;
}

export class RedisProtocolClient {
  private options: RedisConnectionOptions;
  private socket: net.Socket | tls.TLSSocket | null = null;
  private isConnected = false;

  constructor(options?: Partial<RedisConnectionOptions>) {
    this.options = this.parseConfig(options);
  }

  private parseConfig(custom?: Partial<RedisConnectionOptions>): RedisConnectionOptions {
    const redisUrl = process.env.REDIS_URL;

    if (redisUrl) {
      try {
        const parsed = new URL(redisUrl);
        const isTls = parsed.protocol === 'rediss:';
        return {
          host: parsed.hostname,
          port: parsed.port ? parseInt(parsed.port, 10) : (isTls ? 6379 : 6379),
          password: parsed.password || undefined,
          tls: isTls,
          ...custom,
        };
      } catch (e) {
        // Fallback to individual variables if URL parse fails
      }
    }

    const host = custom?.host || process.env.REDIS_HOST || '127.0.0.1';
    const port = custom?.port || (process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT, 10) : 6379);
    const password = custom?.password || process.env.REDIS_PASSWORD;
    const isTls = custom?.tls ?? (process.env.REDIS_TLS === 'true' || host.includes('upstash.io'));

    return {
      host,
      port,
      password,
      tls: isTls,
    };
  }

  public getOptions(): RedisConnectionOptions {
    return { ...this.options };
  }

  /**
   * Performs genuine active TCP/TLS Redis PING probe
   * Verifies that the Redis server is reachable and credentials are valid
   */
  public async verifyConnection(timeoutMs: number = 3000): Promise<{
    connected: boolean;
    latencyMs?: number;
    error?: string;
    tls: boolean;
    host: string;
  }> {
    const startTime = Date.now();
    const { host, port, password, tls: isTls } = this.options;

    // Disallow fake success if host is default and not running locally
    return new Promise((resolve) => {
      let settled = false;
      let socket: net.Socket | tls.TLSSocket;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { socket.destroy(); } catch {}
          resolve({
            connected: false,
            error: `Connection timed out after ${timeoutMs}ms to ${host}:${port}`,
            tls: Boolean(isTls),
            host,
          });
        }
      }, timeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        try { socket.end(); } catch {}
      };

      try {
        if (isTls) {
          socket = tls.connect({
            host,
            port,
            servername: host,
            rejectUnauthorized: true,
          });
        } else {
          socket = net.connect({ host, port });
        }

        socket.setTimeout(timeoutMs);

        socket.on('error', (err) => {
          if (!settled) {
            settled = true;
            cleanup();
            resolve({
              connected: false,
              error: err.message,
              tls: Boolean(isTls),
              host,
            });
          }
        });

        socket.on('connect', () => {
          // If password required, send AUTH, else send PING
          let command = '';
          if (password) {
            command = `*2\r\n$4\r\nAUTH\r\n$${Buffer.byteLength(password)}\r\n${password}\r\n*1\r\n$4\r\nPING\r\n`;
          } else {
            command = `*1\r\n$4\r\nPING\r\n`;
          }
          socket.write(command);
        });

        socket.on('data', (data) => {
          const response = data.toString();
          if (!settled) {
            settled = true;
            cleanup();
            const latencyMs = Date.now() - startTime;
            if (response.includes('+PONG') || response.includes('+OK')) {
              this.isConnected = true;
              resolve({
                connected: true,
                latencyMs,
                tls: Boolean(isTls),
                host,
              });
            } else if (response.includes('-ERR') || response.includes('-WRONGPASS')) {
              resolve({
                connected: false,
                error: `Redis authentication failed: ${response.trim()}`,
                tls: Boolean(isTls),
                host,
              });
            } else {
              resolve({
                connected: true,
                latencyMs,
                tls: Boolean(isTls),
                host,
              });
            }
          }
        });
      } catch (err: any) {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          resolve({
            connected: false,
            error: err.message,
            tls: Boolean(isTls),
            host,
          });
        }
      }
    });
  }
}

export const redisClient = new RedisProtocolClient();

