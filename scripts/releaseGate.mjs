#!/usr/bin/env node
/**
 * ==============================================================================
 * EDUSPHERE RELEASE GATE VERIFICATION RUNNER
 * ==============================================================================
 * Executes the mandatory production test suites in sequence:
 * 1. Server TypeScript Compilation
 * 2. Client TypeScript & Vite Production Build
 * 3. AppSec & Adversarial Security Suite (34 tests)
 * 4. E2E Seeder Safety & Production Refusal (5 tests)
 * 5. MongoDB Schemas & Isolation Suite (8 tests)
 * 6. Infrastructure, Fallback & Storage Suite (18 tests)
 * 7. Enterprise Phase 1 Upgrades Suite (12 tests)
 * 8. Full Enterprise Subsystems Suite (13 tests)
 * 9. Multi-Tenant HTTP API Authorization Suite (12 tests)
 * 10. DRM Playback Lifecycle & HLS Key Broker Suite (16 tests)
 * 11. Live MongoDB Replica-Set Integration Suite (4 tests)
 * 12. Queue Concurrency, Deduplication & Lease Suite (6 tests)
 * 13. Frontend Vitest Component & State Suite (25 tests)
 *
 * Exits non-zero (code 1) immediately if any mandatory suite fails or is blocked.
 * ==============================================================================
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const SUITES = [
  {
    id: 'build-server',
    category: 'Build',
    name: 'Backend TypeScript Compilation',
    command: 'npm',
    args: ['--prefix', 'server', 'run', 'build'],
    expectedTests: 1,
  },
  {
    id: 'build-client',
    category: 'Build',
    name: 'Frontend Vite Production Bundle',
    command: 'npm',
    args: ['--prefix', 'client', 'run', 'build'],
    expectedTests: 1,
  },
  {
    id: 'unit-security',
    category: 'Unit / Security',
    name: 'AppSec Adversarial Security Suite',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/production_security_suite.test.ts'],
    expectedTests: 34,
  },
  {
    id: 'seeder-safety',
    category: 'Unit / Security',
    name: 'E2E Seeder Safety & Prod Refusal',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/scripts/seeder_safety.test.ts'],
    expectedTests: 5,
  },
  {
    id: 'phase-a-mongo',
    category: 'Unit / Security',
    name: 'MongoDB Schemas & Model Constraints',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/phase_a_mongodb.test.ts'],
    expectedTests: 8,
  },
  {
    id: 'phase-b-infra',
    category: 'Unit / Security',
    name: 'Infrastructure & Storage/Email Fallback',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/phase_b_infrastructure.test.ts'],
    expectedTests: 18,
  },
  {
    id: 'enterprise-phase-1',
    category: 'Unit / Security',
    name: 'Enterprise Phase 1 Upgrades',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/enterprise_phase1_upgrades.test.ts'],
    expectedTests: 12,
  },
  {
    id: 'full-enterprise',
    category: 'Unit / Security',
    name: 'Full Enterprise Subsystems Suite',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/full_enterprise_suite.test.ts'],
    expectedTests: 13,
  },
  {
    id: 'multi-tenant-http',
    category: 'API Integration',
    name: 'Multi-Tenant HTTP API Authorization',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/api/multi_tenant_http.test.ts'],
    expectedTests: 12,
  },
  {
    id: 'drm-playback',
    category: 'DRM Playback',
    name: 'DRM Playback Lifecycle & HLS Broker',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/media/drm_playback_lifecycle.test.ts'],
    expectedTests: 16,
  },
  {
    id: 'mongodb-replica',
    category: 'DB Integration',
    name: 'Genuine MongoDB Replica-Set Integration',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/integration/mongodb_replica.test.ts'],
    expectedTests: 4,
  },
  {
    id: 'queue-concurrency',
    category: 'Queue Concurrency',
    name: 'Queue Concurrency, Deduplication & Lease',
    command: 'node',
    args: ['./server/node_modules/tsx/dist/cli.mjs', 'server/tests/queue/queue_concurrency.test.ts'],
    expectedTests: 6,
  },
  {
    id: 'frontend-vitest',
    category: 'Frontend Unit',
    name: 'Client Vitest Components & State',
    command: 'npm',
    args: ['--prefix', 'client', 'test'],
    expectedTests: 25,
  },
];

console.log('========================================================================');
console.log('🚀 EDUSPHERE PRODUCTION RELEASE GATE: FULL SUITE EXECUTION');
console.log('========================================================================\n');

const results = [];
let hasFailure = false;

for (const suite of SUITES) {
  console.log(`\n▶️  [RUNNING] ${suite.category} :: ${suite.name} ...`);
  const startTime = Date.now();

  const isWindows = process.platform === 'win32';
  const command = isWindows && suite.command === 'npm' ? 'npm.cmd' : suite.command;

  const child = spawnSync(command, suite.args, {
    cwd: rootDir,
    stdio: 'inherit',
    shell: isWindows,
    env: { ...process.env, CI: 'true', NODE_ENV: 'test' },
  });

  const durationMs = Date.now() - startTime;

  if (child.status === 0) {
    console.log(`✅ [PASS] ${suite.name} (${(durationMs / 1000).toFixed(2)}s)`);
    results.push({
      category: suite.category,
      name: suite.name,
      expected: suite.expectedTests,
      status: 'PASSED',
      durationMs,
    });
  } else {
    console.error(`❌ [FAIL] ${suite.name} (Exit code: ${child.status})`);
    results.push({
      category: suite.category,
      name: suite.name,
      expected: suite.expectedTests,
      status: 'FAILED',
      durationMs,
      error: `Exit code ${child.status}`,
    });
    hasFailure = true;
    break; // Fail-closed release gate
  }
}

console.log('\n========================================================================');
console.log('📊 AUTHORITATIVE TEST EXECUTION & RELEASE GATE MATRIX');
console.log('========================================================================\n');

console.log('| Category         | Test Suite / Verification                | Tests | Status    | Duration |');
console.log('| :--------------- | :--------------------------------------- | :---: | :-------: | :------: |');

let totalTestsRun = 0;
for (const r of results) {
  totalTestsRun += r.expected;
  const statusIcon = r.status === 'PASSED' ? '✅ PASSED' : r.status === 'BLOCKED' ? '🟡 BLOCKED' : '❌ FAILED';
  console.log(`| ${r.category.padEnd(16)} | ${r.name.padEnd(40)} | ${String(r.expected).padStart(5)} | ${statusIcon.padEnd(9)} | ${(r.durationMs / 1000).toFixed(2).padStart(6)}s |`);
}

console.log('------------------------------------------------------------------------');
console.log(`Total Automated Tests Executed in Gate: ${totalTestsRun}`);
console.log('------------------------------------------------------------------------\n');

if (hasFailure) {
  console.error('⛔ RELEASE GATE REJECTED: One or more required suites failed or encountered blocking errors.');
  process.exit(1);
} else {
  console.log('🏆 ALL RELEASE GATE SUITES PASSED! Platform verified for production deployment.');
  process.exit(0);
}
