'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

const inputClass =
  'w-full rounded border border-brand-line px-3 py-2 text-sm text-brand-ink focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green';

export function SecuritySection() {
  return (
    <div className="mt-8 max-w-2xl space-y-6">
      <TwoFactorCard />
      <PasswordCard />
    </div>
  );
}

function TwoFactorCard() {
  const [status, setStatus] = useState<'loading' | 'off' | 'on' | 'enrolling'>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refresh() {
    const supabase = createClient();
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find((f) => f.status === 'verified');
    setFactorId(verified?.id ?? null);
    setStatus(verified ? 'on' : 'off');
  }

  useEffect(() => {
    refresh();
  }, []);

  async function startEnroll() {
    setError(null);
    const supabase = createClient();

    // Supabase only allows one unverified TOTP factor per user — clear out
    // any abandoned attempt from a previous "Enable" click that was never
    // finished before starting a fresh one.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    const stale = existing?.all?.find((f) => f.factor_type === 'totp' && f.status === 'unverified');
    if (stale) await supabase.auth.mfa.unenroll({ factorId: stale.id });

    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
    if (enrollError || !data) {
      setError(enrollError?.message ?? 'Could not start enrollment.');
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setStatus('enrolling');
  }

  async function cancelEnroll() {
    if (factorId) {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId });
    }
    setFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode('');
    setError(null);
    setStatus('off');
  }

  async function verifyEnroll(event: FormEvent) {
    event.preventDefault();
    if (!factorId) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setError(challengeError?.message ?? 'Could not verify code.');
      setPending(false);
      return;
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code: code.trim(),
    });

    setPending(false);
    if (verifyError) {
      setError('Incorrect code. Please try again.');
      setCode('');
      return;
    }

    setQrCode(null);
    setSecret(null);
    setCode('');
    await refresh();
  }

  async function disable() {
    if (!factorId) return;
    if (!window.confirm('Disable two-factor authentication for this account?')) return;
    setPending(true);
    const supabase = createClient();
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    setPending(false);
    if (unenrollError) {
      setError(unenrollError.message);
      return;
    }
    await refresh();
  }

  return (
    <div className="rounded border border-brand-line bg-brand-paper p-6">
      <h2 className="mb-1 font-heading text-lg text-brand-ink">Two-Factor Authentication</h2>
      <p className="mb-4 text-sm text-brand-ink-3">
        Require a 6-digit code from an authenticator app in addition to your password.
      </p>

      {error && (
        <p role="alert" className="mb-4 text-sm text-brand-red">
          {error}
        </p>
      )}

      {status === 'loading' && <p className="text-sm text-brand-ink-3">Loading…</p>}

      {status === 'off' && (
        <button
          onClick={startEnroll}
          className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green"
        >
          Enable Two-Factor Authentication
        </button>
      )}

      {status === 'on' && (
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-brand-green-soft px-2.5 py-1 text-xs font-medium text-brand-green-2">
            Enabled
          </span>
          <button
            onClick={disable}
            disabled={pending}
            className="text-sm font-medium text-brand-red hover:underline disabled:opacity-60"
          >
            Disable
          </button>
        </div>
      )}

      {status === 'enrolling' && (
        <div className="space-y-4">
          <p className="text-sm text-brand-ink-2">
            Scan this QR code with an authenticator app (Google Authenticator, Authy, 1Password…),
            then enter the 6-digit code it shows.
          </p>
          {qrCode && (
            // qrCode is a data:image/svg+xml URI, not raw markup — render it
            // as an image source rather than injecting it as HTML.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrCode} alt="Scan with your authenticator app" className="w-fit rounded border border-brand-line bg-white p-3" width={200} height={200} />
          )}
          {secret && (
            <p className="text-xs text-brand-ink-4">
              Can&apos;t scan? Enter this key manually: <code className="font-mono">{secret}</code>
            </p>
          )}

          <form onSubmit={verifyEnroll} className="flex items-end gap-3">
            <div>
              <label htmlFor="mfa-enroll-code" className="mb-1 block text-sm font-medium text-brand-ink-2">
                Verification code
              </label>
              <input
                id="mfa-enroll-code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                className={`${inputClass} w-32 text-center tracking-[0.3em]`}
              />
            </div>
            <button
              type="submit"
              disabled={pending || code.length !== 6}
              className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? 'Verifying…' : 'Verify & Enable'}
            </button>
            <button
              type="button"
              onClick={cancelEnroll}
              className="rounded border border-brand-ink px-4 py-2 text-sm font-medium text-brand-ink hover:bg-brand-paper-3"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function PasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setPending(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) {
      setError('Could not verify your session. Please sign in again.');
      setPending(false);
      return;
    }

    // Re-check the CURRENT password before allowing a change — updateUser()
    // doesn't require it, so without this an already-open, unattended
    // session could have its password swapped by anyone at the keyboard.
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (reauthError) {
      setError('Current password is incorrect.');
      setPending(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    setPending(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccess(true);
  }

  return (
    <div className="rounded border border-brand-line bg-brand-paper p-6">
      <h2 className="mb-1 font-heading text-lg text-brand-ink">Change Password</h2>
      <p className="mb-4 text-sm text-brand-ink-3">Update the password for this admin account.</p>

      <form onSubmit={handleSubmit} className="max-w-sm space-y-3">
        <div>
          <label htmlFor="current-password" className="mb-1 block text-sm font-medium text-brand-ink-2">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-brand-ink-2">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-1 block text-sm font-medium text-brand-ink-2">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-brand-red">
            {error}
          </p>
        )}
        {success && <p className="text-sm text-brand-green-2">Password updated.</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-brand-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-green disabled:opacity-60"
        >
          {pending ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
