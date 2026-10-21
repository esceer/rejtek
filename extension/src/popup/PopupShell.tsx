import { Logo } from '@rejtek/ui';
import type { ReactNode } from 'react';

export function PopupShell({ actions, children }: { actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-[420px] flex-col">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
        <Logo />
        <div className="flex-1" />
        {actions}
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
    </div>
  );
}
