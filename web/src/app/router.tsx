import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { DevicesPage } from '../features/devices/DevicesPage';
import { PairPage } from '../features/devices/PairPage';
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
        children: [
          { index: true, element: <VaultPage /> },
          { path: 'devices', element: <DevicesPage /> },
          { path: 'devices/pair', element: <PairPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
