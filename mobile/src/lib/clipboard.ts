import * as Clipboard from 'expo-clipboard';

const CLEAR_AFTER_MS = 30_000;
let clearTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Copies a secret: marked sensitive (no clipboard preview on Android 13+) and cleared
 * again after 30 s.
 */
export async function copySecret(text: string): Promise<void> {
  await Clipboard.setStringAsync(text, { android: { isSensitive: true } });
  clearTimeout(clearTimer);
  clearTimer = setTimeout(() => void Clipboard.setStringAsync(''), CLEAR_AFTER_MS);
}
