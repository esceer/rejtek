import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { installFakeBrowser } from './fake-browser';

beforeEach(() => {
  installFakeBrowser();
});

afterEach(cleanup);
