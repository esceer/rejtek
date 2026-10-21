import { RouterProvider } from 'react-router/dom';
import { SessionProvider } from '../session/SessionContext';
import { QueryProvider } from './QueryProvider';
import { router } from './router';

export function App() {
  return (
    <SessionProvider>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </SessionProvider>
  );
}
