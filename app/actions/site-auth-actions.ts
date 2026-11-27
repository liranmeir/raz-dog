'use server';

import { cookies } from 'next/headers';
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME, expectedAuthToken, isCorrectPassword } from '@/lib/site-auth';

export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  if (!(await isCorrectPassword(password))) {
    return { success: false, error: 'Incorrect password' };
  }

  const token = await expectedAuthToken();
  if (!token) {
    // SITE_PASSWORD got unset between the check above and here - shouldn't
    // happen outside a mid-request env change, but fail closed either way.
    return { success: false, error: 'Site password is not configured' };
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });

  return { success: true };
}

export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
}
