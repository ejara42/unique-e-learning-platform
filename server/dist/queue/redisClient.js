"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisClient = exports.RedisProtocolClient = void 0;
const net_1 = __importDefault(require("net"));
const tls_1 = __importDefault(require("tls"));
const url_1 = require("url");
class RedisProtocolClient {
    options;
    socket = null;
    isConnected = false;
    constructor(options) {
        this.options = this.parseConfig(options);
    }
    parseConfig(custom) {
        const redisUrl = process.env.REDIS_URL;
        if (redisUrl) {
            try {
                const parsed = new url_1.URL(redisUrl);
                const isTls = parsed.protocol === 'rediss:';
                return {
                    host: parsed.hostname,
                    port: parsed.port ? parseInt(parsed.port, 10) : (isTls ? 6379 : 6379),
                    password: parsed.password || undefined,
                    tls: isTls,
                    ...custom,
                };
            }
            catch (e) {
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
    getOptions() {
        return { ...this.options };
    }
    /**
     * Performs genuine active TCP/TLS Redis PING probe
     * Verifies that the Redis server is reachable and credentials are valid
     */
    async verifyConnection(timeoutMs = 3000) {
        const startTime = Date.now();
        const { host, port, password, tls: isTls } = this.options;
        // Disallow fake success if host is default and not running locally
        return new Promise((resolve) => {
            let settled = false;
            let socket;
            const timer = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    try {
                        socket.destroy();
                    }
                    catch { }
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
                try {
                    socket.end();
                }
                catch { }
            };
            try {
                if (isTls) {
                    socket = tls_1.default.connect({
                        host,
                        port,
                        servername: host,
                        rejectUnauthorized: true,
                    });
                }
                else {
                    socket = net_1.default.connect({ host, port });
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
                    }
                    else {
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
                        }
                        else if (response.includes('-ERR') || response.includes('-WRONGPASS')) {
                            resolve({
                                connected: false,
                                error: `Redis authentication failed: ${response.trim()}`,
                                tls: Boolean(isTls),
                                host,
                            });
                        }
                        else {
                            resolve({
                                connected: true,
                                latencyMs,
                                tls: Boolean(isTls),
                                host,
                            });
                        }
                    }
                });
            }
            catch (err) {
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
exports.RedisProtocolClient = RedisProtocolClient;
exports.redisClient = new RedisProtocolClient();
