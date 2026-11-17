# EduSphere Deployment Guide

**Date:** 2026-11-17
**Scope:** Repository-supported deployment and required validation

## 1. Repository Deployment Topology

- API: Render Node web service from `server/`.
- Worker: Render Docker worker from `Dockerfile.worker`.
- Frontend: Cloudflare Pages per staging documentation.
- Database: MongoDB Atlas or a reachable MongoDB replica set.
- Object storage: R2/S3-compatible service.
- Email: Resend.
- Live: LiveKit.
- Payments: Stripe.
- Queue/cache: MongoDB queue is active; Redis/BullMQ are not fully established in source.

## 2. Pre-deployment Checklist

- Use Node 20 or newer.
- Populate only environment variables documented in `DEPLOYMENT_ENVIRONMENT_VARIABLES.md` and `.env.example` files.
- Generate a cryptographically strong `JWT_SECRET`.
- Use a reachable production MongoDB URI, not local or placeholder values.
- Configure restricted CORS origins.
- Configure Stripe webhook signing secret and test endpoint delivery.
- Configure R2/S3 bucket, region, credentials and public URL policy.
- Configure LiveKit URL/API key/secret and room Egress settings.
- Configure Resend API key and verified sender/domain.
- Configure Redis/TLS only if implementing the Redis-backed features.
- Configure the E2E credential values only in staging secret storage.

## 3. Build Commands

```bash
npm ci --prefix server
npm ci --prefix client
npm run build:all
npm run test:release-gate
```

The release gate should be run for the exact commit being promoted.

## 4. Render API

Use `render.yaml` as the deployment reference. The API must expose:

- `/healthz` liveness
- `/api/health/live`
- `/api/health/ready`
- `/api/health/database`
- `/api/health/queue`
- `/api/health/storage`
- `/api/health/integrations`
- `/api/health` operator-aware detail

Detailed health and telemetry endpoints should not be public in production.

## 5. Worker

The Docker worker requires FFmpeg. Validate:

- Container build succeeds.
- `ffmpeg -version` works.
- Worker connects to MongoDB.
- Worker only claims authorized jobs.
- HLS output uploads to object storage.
- Completed/failed job state survives worker restart.

## 6. Frontend

Set `VITE_API_URL` to the API origin and build with the production environment. Configure the SPA rewrite/redirect for client routes. Verify CSP and CORS across the frontend/API domains.

## 7. MongoDB

- Use a production topology supported by application startup.
- Restrict network access from application services.
- Enable TLS and least-privilege database credentials.
- Review destructive migrations before they run.
- Back up before schema/index changes.
- Validate tenant and unique indexes after deployment.

## 8. Live Verification

Before enabling LiveKit:

- Mint and join a real room with instructor and learner tokens.
- Verify join/leave/reconnect behavior.
- Verify host permissions and participant removal.
- Verify recording/Egress if supported.
- Verify webhook delivery and attendance updates.

Before enabling Stripe:

- Complete test-mode checkout.
- Deliver and replay a signed webhook.
- Verify enrollment exactly once.
- Verify refund/cancellation behavior if supported.
- Configure payout onboarding only after business requirements are implemented.

## 9. Smoke Test

Run:

```bash
npm --prefix server run smoke:test
```

Set `TARGET_URL` or `API_URL` to the deployed API. Validate health, catalog, certificate verification, registration hardening and security headers.

## 10. Backup and Recovery

- Run MongoDB backup scripts for Linux or Windows.
- Store backups encrypted outside the application database.
- Restrict restore access to an approved operator.
- Test restore in a separate environment.
- Record recovery time and recovery point objectives.
- Automate backup monitoring and alert failures.

## 11. Rollback

- Preserve application/database compatibility.
- Roll back frontend/API only after checking shared API contracts.
- Do not rollback a database with irreversible schema changes unless a tested rollback exists.
- Keep external provider configuration and webhook endpoints stable during rollback.

## 12. Promotion Criteria

No deployment should be called production-ready until P0/P1 gates pass and the live smoke, external integration and recovery evidence is attached to the release.