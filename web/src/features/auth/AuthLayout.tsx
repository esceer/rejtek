import type { ReactNode } from 'react';
import { HomeIcon } from '../../ui/icons';
import { Logo } from '../../ui/Logo';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="mb-7">
        <Logo size="lg" />
      </div>
      {children}
      <div className="mt-5 flex items-center gap-2 text-[13px] text-muted">
        <HomeIcon size={16} />
        Home network only
      </div>
    </div>
  );
}

export function AuthCard({
  title,
  subtitle,
  children,
  onSubmit,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  onSubmit: () => void;
}) {
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex w-full max-w-[440px] flex-col gap-4 rounded-2xl border border-line bg-surface p-8"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
      </div>
      {children}
    </form>
  );
}
