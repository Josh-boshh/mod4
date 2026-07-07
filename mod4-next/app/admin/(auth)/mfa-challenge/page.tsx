'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function MfaChallengePage() {
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFactor() {
      const supabase = createClient();
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      const totp = data?.totp?.find((f) => f.status === 'verified');
      if (listError || !totp) {
        // No verified factor to challenge against — nothing this page can
        // do, so send them back rather than showing a dead-end form.
        router.push('/admin/login');
        return;
      }
      setFactorId(totp.id);
      setLoading(false);
    }
    loadFactor();
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!factorId) return;
    setError(null);
    setPending(true);

    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? 'Could not start verification. Please try again.');
      setPending(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    if (verifyError) {
      setError('Incorrect code. Please try again.');
      setPending(false);
      setCode('');
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  }

  async function handleUseDifferentAccount() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
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
            <h1 className="font-heading text-2xl text-brand-ink">Two-Factor Verification</h1>
            <p className="mt-1 text-sm text-brand-ink-3">Enter the 6-digit code from your authenticator app</p>
          </div>

          {loading ? (
            <p className="text-center text-sm text-brand-ink-3">Loading…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="mfa-code" className="mb-1 block text-sm font-medium text-brand-ink-2">
                  Verification code
                </label>
                <input
                  id="mfa-code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  autoFocus
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full rounded border border-brand-line px-3 py-2 text-center text-lg tracking-[0.4em] text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-brand-red">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending || code.length !== 6}
                className="w-full rounded bg-brand-ink px-4 py-2.5 text-sm font-semibold tracking-wide text-white transition hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Verifying…' : 'Verify'}
              </button>

              <button
                type="button"
                onClick={handleUseDifferentAccount}
                className="w-full text-center text-sm font-medium text-brand-ink-3 hover:text-brand-ink hover:underline"
              >
                Sign in with a different account
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
