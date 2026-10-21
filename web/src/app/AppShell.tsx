import { NavLink, Outlet } from 'react-router';
import { cx } from '../lib/cx';
import { useUnlockedSession } from '../session/SessionContext';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    'rounded-lg px-3 py-2.5 text-sm no-underline',
    isActive ? 'bg-accent-soft font-semibold text-accent-soft-ink' : 'font-medium text-muted',
  );

export function AppShell() {
  const { session, signOut } = useUnlockedSession();
  return (
    <div className="min-h-dvh">
      <nav className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
          <Logo />
          <div className="flex flex-1 gap-1">
            <NavLink to="/" end className={navLinkClass}>
              Vault
            </NavLink>
            <NavLink to="/devices" className={navLinkClass}>
              Devices
            </NavLink>
          </div>
          <span className="text-sm text-muted">{session.username}</span>
          <Button variant="secondary" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </nav>
      <main className="mx-auto max-w-[1200px] px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
