import { ApiError, DecryptionError, ServerUnreachableError } from '@rejtek/core';

/** Maps sign-in / registration failures to text a user can act on. */
export function authErrorMessage(error: unknown): string {
  if (error instanceof ServerUnreachableError) {
    return 'Cannot reach the server. Are you on the home network?';
  }
  if (error instanceof DecryptionError) {
    return 'Wrong username or master password.';
  }
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
      case 404:
        return 'Wrong username or master password.';
      case 409:
        return 'That username is already taken.';
      case 429:
        return 'Too many attempts. Wait a minute and try again.';
    }
  }
  return 'Something went wrong. Please try again.';
}
