export const AUTO_LOCK_ALARM = 'auto-lock';
export const AUTO_LOCK_MINUTES = 15;

/** (Re)starts the idle timer; the background script locks the vault when it fires. */
export function scheduleAutoLock(): void {
  void browser.alarms.create(AUTO_LOCK_ALARM, { delayInMinutes: AUTO_LOCK_MINUTES });
}
