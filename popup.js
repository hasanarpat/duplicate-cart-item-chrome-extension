const DEFAULTS = {
  duplicateGuardEnabled: true,
  minQuantityToWarn: 2,
  warnOnlySameSeller: false,
  snoozeUntil: 0,
};

const storage = typeof chrome !== 'undefined' && chrome.storage ? chrome.storage : typeof browser !== 'undefined' && browser.storage ? browser.storage : null;

function getEl(id) {
  return document.getElementById(id);
}

function loadSettings() {
  if (!storage?.local?.get) return;
  storage.local.get(DEFAULTS, (s) => {
    getEl('enabled').checked = s.duplicateGuardEnabled !== false;
    getEl('minQty').value = Math.max(1, Number(s.minQuantityToWarn) || 2);
    getEl('warnOnlySameSeller').checked = s.warnOnlySameSeller === true;
  });
}

function saveSettings() {
  if (!storage?.local?.set) return;
  storage.local.set({
    duplicateGuardEnabled: getEl('enabled').checked,
    minQuantityToWarn: Math.max(1, parseInt(getEl('minQty').value, 10) || 2),
    warnOnlySameSeller: getEl('warnOnlySameSeller').checked,
  });
}

function snooze() {
  if (!storage?.local?.set) return;
  const until = Date.now() + 24 * 60 * 60 * 1000;
  storage.local.set({ snoozeUntil: until }, () => {
    getEl('snooze').textContent = 'Erteleme: ' + new Date(until).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });
  });
}

document.addEventListener('DOMContentLoaded', loadSettings);
getEl('enabled').addEventListener('change', saveSettings);
getEl('minQty').addEventListener('change', saveSettings);
getEl('warnOnlySameSeller').addEventListener('change', saveSettings);
getEl('snooze').addEventListener('click', snooze);
