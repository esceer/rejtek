import { Navigate, Outlet } from 'react-router';
import { useSession } from '../session/SessionContext';

export function RequireSession() {
  const { session } = useSession();
  return session ? <Outlet /> : <Navigate to="/login" replace />;
}
