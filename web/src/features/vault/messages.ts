import { ApiError, ServerUnreachableError } from '@rejtek/core';

export function vaultErrorMessage(error: unknown): string {
  if (error instanceof ServerUnreachableError) {
    return 'Cannot reach the server. Are you on the home network?';
  }
  if (error instanceof ApiError && error.status === 409) {
    return 'This item was changed on another device. The latest version is loaded, please try again.';
  }
  return 'Something went wrong. Please try again.';
}
