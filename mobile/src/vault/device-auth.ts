import * as LocalAuthentication from 'expo-local-authentication';

/** Rejtek requires a device screen lock: without one, anyone holding the phone could unlock. */
export async function hasScreenLock(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync();
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

/** Shows the system prompt: fingerprint/face, or the device PIN, pattern or password. */
export async function authenticateUser(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Unlock Rejtek',
    cancelLabel: 'Cancel',
    disableDeviceFallback: false,
  });
  return result.success;
}
