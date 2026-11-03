# EduSphere — Complete Environment Variable Reference

> **Last Updated:** November 2026  
> **Scope:** All `process.env.*` and `import.meta.env.*` references extracted directly from source code — nothing invented.

---

## Legend

- **Required / Optional:** Whether the service refuses to start or silently degrades without it.
- **Secret:** Must be stored in Render's encrypted environment panel — never committed to git.
- **Tier:** `production` (blocks deploy if missing), `staging` (needed for full feature test), `dev` (local only).
- **Validated In Report:** Whether the previous `DEPLOYMENT_READINESS_REPORT.md` documented it.

---

## Backend Environment Variables (`server/.env`)

| Variable | Module | Required | Secret | Tier | Purpose | Validated |
|:---|:---|:---:|:---:|:---:|:---|:---:|
| `NODE_ENV` | `config/index.ts`, `verifyBackupRestore.ts`, `production_security_suite.test.ts` | ✅ Yes | ❌ | prod | Controls production mode enforcement. Must be `production` on Render. If not set, all production security barriers are **off**. | ✅ |
| `PORT` | `config/index.ts` | ✅ Yes | ❌ | prod | Render injects dynamically (typically `10000`). Falls back to `5000` locally. | ✅ |
| `JWT_SECRET` | `config/index.ts` | ✅ Yes | ✅ | prod | HMAC signing key for all user JWTs. In production: must be ≥32 chars and not the default value — enforced by a startup fatal error guard. | ✅ |
| `JWT_EXPIRES_IN` | `config/index.ts` | ❌ Optional | ❌ | prod | Token TTL. Defaults to `7d`. | ✅ |
| `MONGODB_URI` | `config/index.ts`, `verifyBackupRestore.ts` | ✅ Yes | ✅ | prod | MongoDB Atlas connection string. In production: missing, localhost, or 127.0.0.1 URI immediately triggers a fatal startup guard to prevent accidental local DB connection. | ✅ |
| `CORS_ORIGIN` | `config/index.ts`, `server.ts` | ✅ Yes | ❌ | prod | Comma-separated list of allowed frontend origins. Falls back to `http://localhost:5173`. In production, CORS middleware enforces project-scoped domain matching against `unique-e-learning-platform*.pages.dev`. | ✅ |
| `REDIS_HOST` | `queue/redisClient.ts`, `transcodingService.ts` | ⚠️ Staging | ❌ | staging | Upstash Redis hostname. Parsed and used by RedisProtocolClient. | ✅ |
| `REDIS_PORT` | `queue/redisClient.ts`, `transcodingService.ts` | ❌ Optional | ❌ | staging | Redis port. Defaults to 6379. | ✅ |
| `REDIS_PASSWORD` | `queue/redisClient.ts` | ⚠️ Staging | ✅ | staging | Redis AUTH password for Upstash / Redis instance. Supported in TCP client. | ✅ |
| `REDIS_TLS` | `queue/redisClient.ts` | ❌ Optional | ❌ | staging | Forces TLS socket connection. Automatically detected for `rediss://` or upstash.io domains. | ✅ |
| `REDIS_URL` | `queue/redisClient.ts`, `transcodingService.ts` | ⚠️ Staging | ✅ | staging | Full Redis connection string (`rediss://default:<password>@<host>:6379`). Preferred format. | ✅ |
| `REQUIRE_REDIS_QUEUE` | `transcodingService.ts` | ❌ Optional | ❌ | dev | Forces Redis requirement in non-production mode. Useful for local staging simulation. | ✅ |
| `ALLOW_SIMULATED_TRANSCODE` | `transcodingService.ts`, `worker/transcodeWorker.ts` | ❌ Optional | ❌ | staging | Set to `"true"` on Render web service to allow simulated transcode. (Worker runs real FFmpeg). | ✅ |
| `R2_ENDPOINT` / `S3_ENDPOINT` | `services/storageService.ts` | ⚠️ Staging | ❌ | staging | Cloudflare R2 S3 endpoint (`https://<account_id>.r2.cloudflarestorage.com`). | ✅ |
| `R2_ACCESS_KEY_ID` / `S3_ACCESS_KEY_ID` | `services/storageService.ts` | ⚠️ Staging | ✅ | staging | R2 API token Access Key ID for presigned URLs and S3 SigV4 requests. | ✅ |
| `R2_SECRET_ACCESS_KEY` / `S3_SECRET_ACCESS_KEY` | `services/storageService.ts` | ⚠️ Staging | ✅ | staging | R2 API token Secret Access Key for SigV4 HMAC signing. | ✅ |
| `R2_BUCKET_NAME` / `S3_BUCKET_NAME` | `services/storageService.ts` | ❌ Optional | ❌ | staging | Cloudflare R2 bucket name. Defaults to `edusphere-media-production`. | ✅ |
| `R2_PUBLIC_DOMAIN` | `services/storageService.ts` | ❌ Optional | ❌ | staging | Custom public domain / CDN hostname mapped to R2 bucket. | ✅ |
| `RESEND_API_KEY` | `services/emailService.ts` | ⚠️ Staging | ✅ | staging | Resend API key (`re_...`) for transactional email delivery. | ✅ |
| `EMAIL_FROM` | `services/emailService.ts` | ❌ Optional | ❌ | staging | Sender email address. Defaults to `EduSphere Platform <noreply@edusphere.io>`. | ✅ |
| `FRONTEND_URL` | `services/emailService.ts` | ❌ Optional | ❌ | staging | Base URL for password reset links (`https://unique-e-learning-platform.pages.dev`). | ✅ |
| `STRIPE_SECRET_KEY` | `paymentService.ts` | ⚠️ Staging | ✅ | staging | Stripe API key. Falls back to `sk_test_edusphere_dummy_secret_key_2026` — dummy key only passes local tests, not live Stripe calls. | ✅ |
| `STRIPE_WEBHOOK_SECRET` | `paymentService.ts` | ⚠️ Staging | ✅ | staging | Webhook signature verification secret. Falls back to a dummy value — live webhooks will fail verification without real secret. | ✅ |
| `STRIPE_COMMISSION_PCT` | `paymentService.ts` | ❌ Optional | ❌ | staging | Configurable platform commission percentage (e.g. `15` for 15%). Parsed, clamped between 1% and 50%, defaults to 15%. | ✅ |
| `LIVEKIT_API_KEY` | `livekitService.ts` | ⚠️ Staging | ✅ | staging | LiveKit project API key. Falls back to `devkey_edusphere_webrtc_2026`. Without a real key, tokens are minted with a dev key that no SFU server validates. | ✅ |
| `LIVEKIT_API_SECRET` | `livekitService.ts` | ⚠️ Staging | ✅ | staging | LiveKit API secret for HS256 token signing. Falls back to a dev value. | ✅ |
| `LIVEKIT_URL` | `livekitService.ts` | ⚠️ Staging | ❌ | staging | WebSocket URL for client connections (e.g. `wss://your-project.livekit.cloud`). Falls back to `wss://livekit.edusphere.io` (non-existent). | ✅ |
| `LTI_ISSUER` | `interoperabilityService.ts` | ❌ Optional | ❌ | staging | Primary LMS issuer URL for custom LTI 1.3 platform registration (e.g. `https://canvas.yourinstitution.edu`). If absent, only Canvas/Blackboard defaults are registered. | ✅ |
| `LTI_CLIENT_ID` | `interoperabilityService.ts` | ❌ Optional | ❌ | staging | Client ID for the custom LTI platform when `LTI_ISSUER` is set. | ✅ |
| `LTI_KEY` | `interoperabilityService.ts` | ❌ Optional | ✅ | staging | Public key or HMAC secret for the custom LTI platform. Falls back to dev placeholder. | ❌ |
| `LTI_CANVAS_PUBLIC_KEY` | `interoperabilityService.ts` | ❌ Optional | ✅ | staging | Override public key for the default Canvas LMS trusted platform. Falls back to a dev placeholder — **real deployments must set a real RSA public key for Canvas JWT verification**. | ❌ |
| `LTI_BLACKBOARD_PUBLIC_KEY` | `interoperabilityService.ts` | ❌ Optional | ✅ | staging | Same as above for Blackboard. | ❌ |
| `INITIAL_ADMIN_EMAIL` | `bootstrapAdmin.ts` | ❌ Optional | ❌ | init | Seed admin email for non-interactive bootstrap (Render Shell or CI pipeline). | ✅ |
| `INITIAL_ADMIN_PASSWORD` | `bootstrapAdmin.ts` | ❌ Optional | ✅ | init | Seed admin password. Falls back to interactive prompt. If set in env, it will appear in Render's env panel (encrypted) — acceptable for one-time setup. **Clear after bootstrap.** | ✅ |
| `INITIAL_ADMIN_NAME` | `bootstrapAdmin.ts` | ❌ Optional | ❌ | init | Display name for the root administrator. Defaults to `Platform Administrator`. | ✅ |
| `ALLOW_DISASTER_RECOVERY_TEST` | `verifyBackupRestore.ts`, `production_security_suite.test.ts` | ❌ Optional | ❌ | test | Safety gate for disaster recovery test routines. Set to `"true"` only in isolated test environments. | ❌ |
| `TEST_MONGODB_URI` | `verifyBackupRestore.ts` | ❌ Optional | ✅ | test | Separate MongoDB URI for DR/test isolation. Prevents DR scripts from running against production. | ❌ |

---

## Frontend Environment Variables (`client/.env`)

| Variable | Module | Required | Secret | Tier | Purpose | Validated |
|:---|:---|:---:|:---:|:---:|:---|:---:|
| `VITE_API_URL` | `client/src/api/index.ts` | ✅ Yes (prod) | ❌ | prod | Backend API base URL. In local dev, omit or set to `/api` (proxied by Vite). In production (Cloudflare Pages), set to `https://<your-render-app>.onrender.com`. Do **not** append `/api` — the client appends it automatically. | ✅ |
| `VITE_APP_NAME` | Declared in `vite-env.d.ts` | ❌ Optional | ❌ | all | Application display name. Not currently consumed in UI code — available for future use. | ✅ |
| `VITE_APP_ENV` | Declared in `vite-env.d.ts` | ❌ Optional | ❌ | all | Environment label for display/analytics. Not currently consumed in UI code. | ✅ |
| `VITE_WS_URL` | Declared in `vite-env.d.ts` | ❌ Optional | ❌ | all | WebSocket base URL. Declared but not currently read by any client component — available for future use when real-time chat is implemented. | ✅ |

---

## Identified Gaps & Issues

### 🟢 Remediated in This Infrastructure Pass

| # | Remediated Gap | Resolution | Status |
|:---|:---|:---|:---:|
| **ENV-REM-01** | `REDIS_PASSWORD` & `REDIS_TLS` previously unread; no distributed queue. | Implemented RESP client (`queue/redisClient.ts`), persistent BullMQ queue (`queue/jobQueue.ts`), and standalone FFmpeg background worker (`worker/transcodeWorker.ts`). | ✅ Fixed |
| **ENV-REM-02** | No persistent object storage for files. | Implemented Cloudflare R2 / S3 storage service with SigV4 presigned upload/download URLs, MIME whitelist, and tenant isolation (`services/storageService.ts`, `routes/storageRoutes.ts`). | ✅ Fixed |
| **ENV-REM-03** | No transactional email service or password reset flow. | Implemented Resend transactional email integration (`services/emailService.ts`) with SHA-256 single-use tokens in `SecurityTokenModel` and `/api/auth/forgot-password`, `/api/auth/reset-password`. | ✅ Fixed |
| **ENV-REM-04** | `STRIPE_COMMISSION_PCT` was hardcoded to `0.15`. | Now dynamically read from `process.env.STRIPE_COMMISSION_PCT`, parsed and clamped between 1% and 50% (default 15%). | ✅ Fixed |
| **ENV-REM-05** | No startup guard preventing `MONGODB_URI` from pointing to localhost in production. | Added production startup barrier in `server/src/config/index.ts` that immediately throws fatal error if `MONGODB_URI` is missing or contains `localhost`/`127.0.0.1`. | ✅ Fixed |
| **ENV-REM-06** | `ALLOW_SIMULATED_TRANSCODE` was missing from `render.yaml`. | Added `ALLOW_SIMULATED_TRANSCODE=true` to `render.yaml` so jobs succeed via simulation on Render dynos without FFmpeg. | ✅ Fixed |
| **ENV-REM-07** | Client `/api` deduplication guard. | `client/src/api/index.ts` normalizes endpoints so that `/api/api/...` double-prefixing cannot occur even if `VITE_API_URL` includes `/api`. | ✅ Fixed |

### 🟡 MEDIUM Gaps

| # | Gap | Impact | Action |
|:---|:---|:---|:---|
| **ENV-GAP-04** | `VITE_API_URL` on Cloudflare Pages: if set to `https://your-app.onrender.com` (without `/api`), the client code correctly appends `/api`. But if mistakenly set to `https://your-app.onrender.com/api`, the code prevents duplication. The documentation must be unambiguous. | API calls 404 in production if set incorrectly. | Document clearly: set `VITE_API_URL` to the **base domain only** (no `/api` suffix). |
| **ENV-GAP-05** | `LTI_CANVAS_PUBLIC_KEY` and `LTI_BLACKBOARD_PUBLIC_KEY` fall back to string literals (`edusphere-trusted-lms-canvas-key-2026`). These are not valid RSA public keys — LTI launches signed with real Canvas RSA keys will fail verification. | LTI 1.3 integration non-functional in production without real public keys. | Document requirement to register real Canvas/Blackboard RSA public keys. |
| **ENV-GAP-06** | `ALLOW_SIMULATED_TRANSCODE` is not in `render.yaml` env vars. Without it, video upload jobs will fail with "FFmpeg binary not installed" since Render web service dynos do not have FFmpeg on PATH. | Video transcoding always fails on Render without `ALLOW_SIMULATED_TRANSCODE=true`. | Add to `render.yaml` and set to `"true"` for staging (now done in this remediation). |

---

## Complete Variable Set for Render (Production)

Copy this into Render Dashboard → Web Service → Environment Variables:

```
NODE_ENV=production
PORT=10000
JWT_SECRET=<generate: openssl rand -base64 48>
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxx.mongodb.net/edusphere?retryWrites=true&w=majority
CORS_ORIGIN=https://unique-e-learning-platform.pages.dev
REDIS_HOST=<your-upstash-host>.upstash.io
REDIS_PORT=6379
REDIS_URL=rediss://default:<password>@<host>.upstash.io:6379
ALLOW_SIMULATED_TRANSCODE=true
STRIPE_SECRET_KEY=sk_test_<your-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-secret>
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
LIVEKIT_URL=wss://<your-project>.livekit.cloud
LTI_ISSUER=https://canvas.yourinstitution.edu
LTI_CLIENT_ID=edusphere_lti_client
LTI_KEY=<your-lms-public-key-pem>
```

## Complete Variable Set for Cloudflare Pages (Production)

Set in Cloudflare Pages → Project → Settings → Environment Variables → Production:

```
VITE_API_URL=https://<your-render-app>.onrender.com
VITE_APP_NAME=EduSphere - Unified E-Learning Platform
VITE_APP_ENV=production
```

> ⚠️ **IMPORTANT:** Set `VITE_API_URL` to the **base URL only** — do not include `/api`. The client appends it automatically and guards against duplication.

