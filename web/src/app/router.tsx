import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { VaultPage } from '../features/vault/VaultPage';
import { AppShell } from './AppShell';
import { RequireSession } from './RequireSession';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  {
    element: <RequireSession />,
    children: [
      {
        element: <AppShell />,
        children: [{ index: true, element: <VaultPage /> }],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
