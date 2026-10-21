import type { ApiClient, UnlockedSession } from '@rejtek/core';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryProvider } from '../app/QueryProvider';
import { SessionProvider } from '../session/SessionContext';

/** Renders `element` at `/` inside the real providers, with a fake API. */
export function renderWithProviders(
  element: ReactElement,
  api: Partial<ApiClient>,
  session: UnlockedSession | null = null,
) {
  return render(
    <SessionProvider createApi={() => api as ApiClient} initialSession={session}>
      <QueryProvider>
        <MemoryRouter>
          <Routes>
            <Route path="/" element={element} />
            <Route path="*" element={<div>navigated away</div>} />
          </Routes>
        </MemoryRouter>
      </QueryProvider>
    </SessionProvider>,
  );
}
