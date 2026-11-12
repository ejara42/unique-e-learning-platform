# EduSphere — Staging Deployment Guide

> **Platform Stack:** Cloudflare Pages (Frontend SPA) + Render (Backend API) + MongoDB Atlas + Upstash Redis  
> **Last Updated:** November 2026

---

## Pre-Deployment Checklist

Before starting:

- [ ] GitHub repository pushed to `main` branch: `https://github.com/ejara42/unique-e-learning-platform`
- [ ] `client/package-lock.json` exists (confirmed ✅)
- [ ] `server/package-lock.json` exists (confirmed ✅)
- [ ] Local builds clean: `npm --prefix server run build` and `npm --prefix client run build` both exit 0
- [ ] All test suites pass: `npm run test:release-gate` (156 automated tests across 11 suites + 2 build checks, 100% pass rate; 3/3 Playwright browser E2E workflows pass)
- [ ] No real credentials in any tracked file — `server/.env.example` uses only placeholders

---

## Phase 1: MongoDB Atlas Database

### 1.1 Create Cluster

1. Log in to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Click **Create** → **M0 Free Tier** (for staging) or **M10+** (for production)
3. Choose **Cloud Provider**: AWS, Region: `us-east-1` (or nearest to Render's Oregon region)
4. Cluster name: `edusphere-staging`

### 1.2 Create Database User

1. Go to **Database Access** → **Add New Database User**
2. Authentication method: **Password**
3. Username: `edusphere_app`
4. Password: Generate a strong random password (no special characters that require URL encoding: avoid `@`, `/`, `:`, `?`, `#`)
5. Database User Privileges: **Read and write to any database**
6. Click **Add User**

### 1.3 Configure Network Access

1. Go to **Network Access** → **Add IP Address**
2. Add `0.0.0.0/0` — "Allow access from anywhere"

> ⚠️ **Security Note:** `0.0.0.0/0` is required for Render because it uses dynamic egress IPs. This means MongoDB is network-accessible from any IP — the security perimeter relies on strong credentials and TLS. Atlas enforces TLS by default. For production-critical workloads, evaluate [Render's static IP add-on](https://render.com/docs/static-ip-addresses) combined with Atlas IP allowlisting.

### 1.4 Get Connection String

1. **Database** → **Connect** → **Drivers (Node.js)**
2. Copy the URI — it looks like:
   ```
   mongodb+srv://edusphere_app:<password>@edusphere-staging.xxxx.mongodb.net/?retryWrites=true&w=majority
   ```
3. Replace `<password>` with your actual password
4. Append the database name before the `?`:
   ```
   mongodb+srv://edusphere_app:<password>@edusphere-staging.xxxx.mongodb.net/edusphere?retryWrites=true&w=majority&appName=edusphere
   ```

**✅ Pass Condition:** URI is complete, contains `/edusphere`, and has your real password substituted.

---

## Phase 2: Queue Architecture & Worker Configuration

> ℹ️ **Architecture (Option B):** The background transcoding queue is powered by a high-resilience, persistent MongoDB FIFO queue (`TranscodeJobModel`, `jobQueue.ts`) with duplicate job protection, exponential backoff retries, and worker crash recovery (`recoverStalledJobs()`). 
>
> The Express API gateway (`edusphere-api`) enqueues transcode jobs directly into MongoDB without requiring local FFmpeg binaries. The dedicated Render background worker (`edusphere-transcode-worker`), provisioned via `Dockerfile.worker`, pulls and processes transcode jobs using actual system FFmpeg and FFprobe binaries.
>
> Upstash Redis connection parameters (`REDIS_URL`) remain supported for distributed cache-aside layers.

### 2.1 Worker Service Deployment
The Render Blueprint (`render.yaml`) automatically configures the background worker:
- **Service Name:** `edusphere-transcode-worker`
- **Runtime:** `docker` (`Dockerfile.worker`)
- **Command:** `node dist/worker/transcodeWorker.js`
- **Environment:** Inherits `MONGODB_URI`, `R2_*` storage credentials, and `JWT_SECRET`.

**✅ Pass Condition:** `render.yaml` contains both `edusphere-api` and `edusphere-transcode-worker`. Both services start and maintain independent lifecycles.

---

## Phase 3: Deploy Backend to Render

### 3.1 Create Web Service

1. Log in to [render.com](https://render.com) → **New +** → **Web Service**
2. Connect GitHub: authorize and select `unique-e-learning-platform`
3. Configure:

| Setting | Value |
|:---|:---|
| **Name** | `edusphere-api` |
| **Region** | Oregon (US West) |
| **Branch** | `main` |
| **Root Directory** | `server` |
| **Runtime** | Node |
| **Build Command** | `npm ci && npm run build` |
| **Start Command** | `npm run start` |
| **Plan** | Starter (\$7/mo) or Free |
| **Health Check Path** | `/healthz` |

### 3.2 Set Environment Variables

In **Environment** → **Add Environment Variable**, add each of the following:

| Key | Value |
|:---|:---|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | *(Generate: `openssl rand -base64 48`)* |
| `JWT_EXPIRES_IN` | `7d` |
| `CDN_SIGNING_SECRET` | *(Generate: `openssl rand -base64 48`)* |
| `EMAIL_FROM` | `EduSphere Platform <notifications@edusphere.io>` |
| `MONGODB_URI` | *(Full Atlas URI from Phase 1.4)* |
| `CORS_ORIGIN` | `https://unique-e-learning-platform.pages.dev` |
| `ALLOW_SIMULATED_TRANSCODE` | `true` |
| `REDIS_HOST` | *(Upstash host, or omit for staging)* |
| `REDIS_PORT` | `6379` |
| `REDIS_URL` | *(Full rediss:// URL, or omit for staging)* |
| `LIVEKIT_API_KEY` | *(From LiveKit Cloud dashboard)* |
| `LIVEKIT_API_SECRET` | *(From LiveKit Cloud dashboard)* |
| `LIVEKIT_URL` | `wss://your-project.livekit.cloud` |
| `STRIPE_SECRET_KEY` | `sk_test_...` *(Stripe test key)* |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` *(From Stripe Webhook config)* |

### 3.3 Deploy

Click **Create Web Service**. Render will:
1. Clone the repo
2. `cd server && npm ci && npm run build`
3. Start: `node dist/server.js`
4. Health check `/healthz`

**✅ Pass Condition:** Render Dashboard shows **Live** status. Health probe returns green.

### 3.4 Verify Backend Health

Open in your browser (or `curl`):
```
https://edusphere-api.onrender.com/healthz
```
Expected response:
```json
{ "status": "ok", "uptime": 42.3, "timestamp": "2026-11-02T..." }
```

Then check detailed diagnostics:
```
https://edusphere-api.onrender.com/api/health
```
Expected:
- `database.connected: true`
- `status: "ONLINE"`

**✅ Pass Condition:** Both endpoints return HTTP 200. Database shows `connected: true`.  
**❌ Fail Condition:** `database.connected: false` → Check `MONGODB_URI` and Atlas Network Access.

### 3.5 Initialize SuperAdmin

From the Render Dashboard → **Web Service** → **Shell** tab:

```bash
npm run bootstrap:admin
```

You will be prompted interactively for:
- Administrator Email (e.g. `admin@edusphere.local`)
- Full Name
- Password (masked input, min 12 chars, must include uppercase, lowercase, number, special character)

> ⚠️ **Security:** The script blocks `--password` CLI flag. Use only the interactive masked prompt or `INITIAL_ADMIN_EMAIL` + `INITIAL_ADMIN_PASSWORD` environment variables. Set those env vars, run bootstrap, then **immediately delete them from Render's environment panel**.

**✅ Pass Condition:** Script prints `✅ Success: Root Platform Administrator provisioned!`  
**❌ Fail Condition A:** `⚠️ Aborted: Platform SuperAdmin already exists` → An admin already exists; do not re-run.  
**❌ Fail Condition B:** Database error → Verify MongoDB Atlas connection from Phase 1.

---

## Phase 4: Deploy Frontend to Cloudflare Pages

### 4.1 Create Pages Project

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com)
2. **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
3. Select repository: `unique-e-learning-platform`

### 4.2 Build Configuration

| Setting | Value |
|:---|:---|
| **Project name** | `unique-e-learning-platform` |
| **Production branch** | `main` |
| **Root directory** | `client` |
| **Framework preset** | None (or Vite) |
| **Build command** | `npm ci && npm run build` |
| **Build output directory** | `dist` |

### 4.3 Environment Variables (Production)

Under **Environment Variables** → **Production**:

| Variable | Value |
|:---|:---|
| `VITE_API_URL` | `https://edusphere-api.onrender.com` |
| `VITE_APP_NAME` | `EduSphere - Unified E-Learning Platform` |
| `VITE_APP_ENV` | `production` |

> ⚠️ **Critical:** Set `VITE_API_URL` to the **base domain only** — the client code automatically appends `/api`. Do **not** set it to `https://edusphere-api.onrender.com/api` or API calls will target `/api/api/...`.

### 4.4 Deploy

Click **Save and Deploy**. Cloudflare builds `client/` using the production env vars and deploys to their global CDN.

Your URL: `https://unique-e-learning-platform.pages.dev`

**✅ Pass Condition:** Build completes in Cloudflare dashboard. Domain resolves and shows the EduSphere landing page.

### 4.5 Verify SPA Routing

Navigate directly to:
```
https://unique-e-learning-platform.pages.dev/login
```

Press **F5** (browser refresh).

**✅ Pass Condition:** Page reloads correctly — does NOT return a 404 error. Confirms `_redirects` is active.  
**❌ Fail Condition:** 404 Not Found → Verify `client/public/_redirects` exists with `/* /index.html 200` and that the build output directory contains it.

### 4.6 Verify CORS

1. Open DevTools (F12) → **Network** tab
2. Navigate to the login page
3. Enter credentials and attempt sign-in

**✅ Pass Condition:** XHR/fetch requests to `edusphere-api.onrender.com` succeed with `access-control-allow-origin` response header matching `https://unique-e-learning-platform.pages.dev`.  
**❌ Fail Condition:** CORS error in console → Verify `CORS_ORIGIN` on Render matches the exact Cloudflare Pages domain.

---

## Phase 5: Connect Stripe Webhooks (Optional for Initial Staging)

1. Log in to [dashboard.stripe.com](https://dashboard.stripe.com)
2. **Developers** → **Webhooks** → **Add Endpoint**
3. Endpoint URL: `https://edusphere-api.onrender.com/api/payments/webhook`
4. Events to listen for: `checkout.session.completed`, `payment_intent.payment_failed`
5. Copy the **Signing Secret** (`whsec_...`)
6. Update Render env var: `STRIPE_WEBHOOK_SECRET=whsec_...`
7. Redeploy or use Render's **Manual Deploy**

**✅ Pass Condition:** Stripe sends a test event and the Render logs show `[Stripe Webhook]` processing without signature rejection errors.

---

## Phase 6: Configure LiveKit (Required for Live Classrooms)

1. Sign up/log in at [cloud.livekit.io](https://cloud.livekit.io)
2. Create a project
3. Copy API Key, API Secret, and WebSocket URL
4. Set in Render:
   ```
   LIVEKIT_API_KEY=APIxxxxxxxx
   LIVEKIT_API_SECRET=xxxxxxxx
   LIVEKIT_URL=wss://your-project-slug.livekit.cloud
   ```

**✅ Pass Condition:** `GET /api/health` shows `liveKit.configured: true` and `liveKit.reachable: true`.  
**❌ Fail Condition:** `reachable: false` → LiveKit SFU server is unreachable. Token minting still works but real A/V sessions will not connect.

---

## Phase 7: Configure Cloudflare R2 Persistent Object Storage

1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com) → **R2**
2. Click **Create bucket** → Name: `edusphere-media-production`
3. Go to **R2 Overview** → **Manage R2 API Tokens** → **Create API Token**
   - Permissions: **Object Read & Write**
   - Apply to bucket: `edusphere-media-production`
4. Copy:
   - Access Key ID
   - Secret Access Key
   - Endpoint: `https://<account_id>.r2.cloudflarestorage.com`
5. In Render `edusphere-api` Environment:
   ```
   R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
   R2_ACCESS_KEY_ID=<your-access-key-id>
   R2_SECRET_ACCESS_KEY=<your-secret-access-key>
   R2_BUCKET_NAME=edusphere-media-production
   ```

**✅ Pass Condition:** `GET /api/health` reports `objectStorage.configured: true, status: "ONLINE"`.

---

## Phase 8: Configure Resend Transactional Email

1. Sign up at [resend.com](https://resend.com)
2. Go to **API Keys** → **Create API Key** → Full Access
3. (Optional) Add your verified sending domain in **Domains**
4. In Render `edusphere-api` Environment:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=EduSphere Platform <noreply@yourdomain.com>
   FRONTEND_URL=https://unique-e-learning-platform.pages.dev
   ```

**✅ Pass Condition:** `GET /api/health` reports `transactionalEmail.configured: true, status: "ONLINE"`. Password reset emails dispatch live.

---

## Phase 9: Deploy Dedicated FFmpeg Background Worker (Production)

For true production transcoding without simulation:

1. Render Dashboard → **New +** → **Background Worker**
2. Connect `unique-e-learning-platform` repository
3. Environment: **Docker**
4. Dockerfile path: `Dockerfile.worker`
5. Environment Variables:
   ```
   NODE_ENV=production
   MONGODB_URI=<same Atlas connection URI>
   REDIS_URL=<same Upstash Redis rediss:// URI>
   R2_ENDPOINT=<same R2 endpoint>
   R2_ACCESS_KEY_ID=<same R2 access key>
   R2_SECRET_ACCESS_KEY=<same R2 secret key>
   R2_BUCKET_NAME=edusphere-media-production
   ALLOW_SIMULATED_TRANSCODE=false
   ```
6. Click **Create Background Worker**

**✅ Pass Condition:** Worker logs report `[Worker] Redis Connectivity: ONLINE`, `FFmpeg Detected: YES`, and processes videos into HLS multi-bitrate streams uploaded directly to Cloudflare R2.

---

## Production Readiness Summary

| Subsystem | Staging Mode | Production Deployment |
|:---|:---|:---|
| Object Storage | In-memory dual-mode & SigV4 URLs | Cloudflare R2 bucket with custom domain |
| Transactional Email | Dev simulation / Live Resend | Verified domain on Resend |
| Queue / Task Processing | In-memory fallback / Redis | Upstash Redis TLS + BullMQ |
| Video Transcoding | In-process simulation (`ALLOW_SIMULATED_TRANSCODE=true`) | Dedicated Docker FFmpeg Worker (`Dockerfile.worker`) |

