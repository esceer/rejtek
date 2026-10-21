import { signIn } from '@rejtek/core';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { Alert, Button, TextField } from '@rejtek/ui';
import { loadSodium } from '../../lib/sodium';
import { useSession } from '../../session/SessionContext';
import { AuthCard, AuthLayout } from './AuthLayout';
import { authErrorMessage } from './messages';

export function LoginPage() {
  const { session, api, start } = useSession();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: async () => signIn(await loadSodium(), api, username.trim(), password),
    onSuccess: (unlocked) => {
      start(unlocked);
      void navigate('/', { replace: true });
    },
  });

  if (session) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout>
      <AuthCard
        title="Sign in"
        subtitle="Your vault is decrypted in this browser only."
        onSubmit={() => {
          if (username.trim() && password) {
            login.mutate();
          }
        }}
      >
        <TextField
          label="Username"
          autoComplete="username"
          autoFocus
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
          }}
        />
        <TextField
          label="Master password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
        {login.isError && <Alert tone="danger">{authErrorMessage(login.error)}</Alert>}
        <Button type="submit" disabled={login.isPending || !username.trim() || !password}>
          {login.isPending ? 'Unlocking…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-muted">
          New here?{' '}
          <Link to="/register" className="font-semibold text-accent">
            Create an account
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
