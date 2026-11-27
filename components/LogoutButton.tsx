'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { logout } from '@/app/actions/site-auth-actions';

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await logout();
          router.push('/login');
          router.refresh();
        })
      }
      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
    >
      יציאה
    </button>
  );
}
