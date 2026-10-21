import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/',
      '**/dist/',
      '**/coverage/',
      'server/',
      'mobile/android/',
      'mobile/ios/',
      'mobile/.expo/',
      'mobile/expo-env.d.ts',
      'extension/artifacts/',
    ],
  },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    files: ['{web,mobile,extension}/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat['recommended-latest']],
  },
  { files: ['**/*.js'], extends: [tseslint.configs.disableTypeChecked] },
  prettier,
);
