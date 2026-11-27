import { cookies } from 'next/headers';
import { AUTH_COOKIE_NAME, expectedAuthToken } from '@/lib/site-auth';

/** Server-side check that the caller unlocked the parent area. Fails closed. */
export async function isParent(): Promise<boolean> {
  const expected = await expectedAuthToken();
  if (!expected) return false;
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value === expected;
}
