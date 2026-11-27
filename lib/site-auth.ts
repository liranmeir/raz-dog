/**
 * Minimal shared-password gate: one password (SITE_PASSWORD env var) for
 * the whole app, no per-user accounts. The cookie never stores the
 * password itself - it stores sha256(password), computed with the Web
 * Crypto API so this works in both the Edge and Node runtimes (middleware
 * may run on either). middleware.ts compares the cookie against the same
 * hash recomputed from the current env var on every request.
 */
export const AUTH_COOKIE_NAME = 'raz_dog_parent_auth';
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * The cookie value a logged-in session should carry, or null if
 * SITE_PASSWORD isn't configured - callers should fail closed (deny
 * everyone) in that case rather than silently allow access.
 */
export async function expectedAuthToken(): Promise<string | null> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  return sha256Hex(password);
}

export async function isCorrectPassword(candidate: string): Promise<boolean> {
  const password = process.env.SITE_PASSWORD;
  if (!password) return false;
  return candidate === password;
}
