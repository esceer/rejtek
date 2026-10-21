import { createAccount, signIn } from '@rejtek/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Alert, Button, StrengthMeter, TextField } from '@rejtek/ui';
import { loadSodium } from '../../lib/sodium';
import { useSession } from '../../session/SessionContext';
import { AuthCard, AuthLayout } from './AuthLayout';
import { authErrorMessage } from './messages';

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 10;

interface FormErrors {
  username?: string;
  password?: string;
  confirm?: string;
  acknowledged?: string;
}

export function RegisterPage() {
  const { session, api, start } = useSession();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const register = useMutation({
    mutationFn: async () => {
      const sodium = await loadSodium();
      await createAccount(sodium, api, username.trim(), password);
      return signIn(sodium, api, username.trim(), password);
    },
    onSuccess: (unlocked) => {
      start(unlocked);
      void navigate('/', { replace: true });
    },
  });

  if (session) {
    return <Navigate to="/" replace />;
  }

  const submit = () => {
    const next: FormErrors = {};
    if (!USERNAME_PATTERN.test(username.trim())) {
      next.username = '3–32 characters: letters, digits, dot, dash or underscore.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Use at least ${String(MIN_PASSWORD_LENGTH)} characters.`;
    }
    if (confirm !== password) {
      next.confirm = 'The passwords do not match.';
    }
    if (!acknowledged) {
      next.acknowledged = 'Please confirm you understand.';
    }
    setErrors(next);
    if (Object.keys(next).length === 0) {
      register.mutate();
    }
  };

  return (
    <AuthLayout>
      <AuthCard
        title="Create an account"
        subtitle="Each person gets their own private vault."
        onSubmit={submit}
      >
        <TextField
          label="Username"
          autoComplete="username"
          autoFocus
          value={username}
          error={errors.username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
        <div className="flex flex-col gap-2.5">
          <TextField
            label="Master password"
            type="password"
            autoComplete="new-password"
            value={password}
            error={errors.password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <StrengthMeter password={password} />
        </div>
        <TextField
          label="Repeat master password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          error={errors.confirm}
          onChange={(e) => {
            setConfirm(e.target.value);
          }}
        />
        <Alert tone="warn">
          <strong>There is no password reset.</strong> Your vault is encrypted with this password.
          If you forget it, nobody can recover your data.
        </Alert>
        <div>
          <label className="flex min-h-11 items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => {
                setAcknowledged(e.target.checked);
              }}
              className="size-5 accent-accent"
            />
            I understand and have stored my master password safely
          </label>
          {errors.acknowledged && <div className="text-xs text-danger">{errors.acknowledged}</div>}
        </div>
        {register.isError && <Alert tone="danger">{authErrorMessage(register.error)}</Alert>}
        <Button type="submit" disabled={register.isPending}>
          {register.isPending ? 'Creating your vault…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-muted">
          Already have one?{' '}
          <Link to="/login" className="font-semibold text-accent">
            Sign in
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
