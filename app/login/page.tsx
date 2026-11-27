'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '@/app/actions/site-auth-actions';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    const password = String(formData.get('password') ?? '');

    startTransition(async () => {
      const result = await login(password);
      if (!result.success) {
        setError('סיסמה שגויה');
        return;
      }
      router.push('/parent');
      router.refresh();
    });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">אזור הורים</h1>
        <p className="mt-1 text-sm text-slate-500">הכנס סיסמה כדי להמשיך</p>
      </div>
      <form action={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          name="password"
          type="password"
          required
          autoFocus
          placeholder="סיסמה"
          className="rounded-md border border-slate-300 px-3 py-2 text-base"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-blue-600 px-4 py-2 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? 'בודק…' : 'כניסה'}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Link href="/" className="text-center text-sm text-slate-500 underline">
          חזרה למשחק
        </Link>
      </form>
    </main>
  );
}
