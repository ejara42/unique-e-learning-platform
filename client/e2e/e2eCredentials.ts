/**
 * Strict Environment Credential Resolver for Playwright E2E Tests
 * Eliminates all hardcoded passwords and ensures tests fail-closed if credentials are not configured.
 */

export function getRequiredE2ECredential(envVar: string, roleName: string): string {
  const value = process.env[envVar]?.trim();
  if (!value) {
    throw new Error(
      `\n❌ [FATAL E2E CONFIGURATION ERROR] Missing required environment variable: '${envVar}'\n` +
      `   Playwright ${roleName} end-to-end testing requires this credential to authenticate.\n` +
      `   Export '${envVar}' in your environment or CI pipeline secrets before executing tests.\n`
    );
  }
  return value;
}

export function getE2EEmail(envVar: string, defaultEmail: string): string {
  return process.env[envVar]?.trim() || defaultEmail;
}

