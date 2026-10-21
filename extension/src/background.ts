import { AUTO_LOCK_ALARM } from './lib/auto-lock';
import { SESSION_VAULT_KEY } from './lib/storage';

// The only background job: forget the vault key after the idle period.
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === AUTO_LOCK_ALARM) {
    void browser.storage.session.remove(SESSION_VAULT_KEY);
  }
});
