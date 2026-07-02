'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Unable to sign in.');
        setPending(false);
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError('Something went wrong. Please try again.');
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-brand-paper-2">
      <div className="h-1.5 w-full bg-brand-green" />

      <div className="flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-sm rounded border border-brand-line bg-brand-paper p-8 shadow-[0_18px_40px_rgba(14,26,20,.10),0_4px_8px_rgba(14,26,20,.04)]">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-3">
              <Image src="/brand/coat-of-arms.png" alt="" width={48} height={41} />
              <Image src="/brand/mod-logo.png" alt="" width={48} height={48} className="opacity-90" />
            </div>
            <h1 className="font-heading text-2xl text-brand-ink">Admin Login</h1>
            <p className="mt-1 text-sm text-brand-ink-3">Ministry of Defence — content admin</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1 block text-sm font-medium text-brand-ink-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-brand-ink-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-brand-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="w-full rounded bg-brand-ink px-4 py-2.5 text-sm font-semibold tracking-wide text-white transition hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
