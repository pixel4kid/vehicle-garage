import { useRef } from 'react';
import { resetAll, saveSettings, useData } from '../store';
import { exportCsv, exportJson, importJson } from '../backup';
import type { Theme } from '../types';
import { Chips, Field, Header, confirmDialog, showToast } from '../components/ui';
import { Icon } from '../components/Icon';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'PKR', 'INR', 'AED', 'SAR', 'CAD', 'AUD', 'JPY', 'CNY', 'TRY', 'BRL', 'ZAR', 'NGN', 'BDT'];

export const REPO_URL = 'https://github.com/your-username/vehicle-garage';

export function SettingsScreen() {
  const { settings, vehicles, logs } = useData();
  const fileInput = useRef<HTMLInputElement>(null);

  const run = async (fn: () => Promise<void>, done: string) => {
    try {
      await fn();
      showToast(done);
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Something went wrong');
    }
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    const ok = await confirmDialog('Importing a backup replaces all data currently in the app. Continue?', { confirmLabel: 'Import' });
    if (ok) await run(() => importJson(file), 'Backup imported');
    if (fileInput.current) fileInput.current.value = '';
  };

  const currencies = CURRENCIES.includes(settings.currency) ? CURRENCIES : [settings.currency, ...CURRENCIES];

  return (
    <div className="screen">
      <Header title="Settings" />
      <main className="content form">
        <Field label="Currency">
          <select value={settings.currency} onChange={(e) => saveSettings({ currency: e.target.value })}>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Theme">
          <Chips<Theme>
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            value={settings.theme}
            onChange={(theme) => saveSettings({ theme })}
          />
        </Field>

        <p className="section-label">Backup</p>
        <p className="muted small">
          Everything stays on this device. {vehicles.length} vehicles, {logs.length} logs. Export a backup now and then so you don't lose it.
        </p>
        <div className="button-list">
          <button className="btn ghost" onClick={() => run(exportJson, 'Backup exported')}>
            <Icon name="download" size={18} /> Export backup (JSON)
          </button>
          <button className="btn ghost" onClick={() => run(exportCsv, 'CSV exported')}>
            <Icon name="download" size={18} /> Export logs (CSV, for Excel)
          </button>
          <button className="btn ghost" onClick={() => fileInput.current?.click()}>
            <Icon name="upload" size={18} /> Import backup
          </button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
        </div>

        <p className="section-label">Danger zone</p>
        <button
          className="btn danger-ghost block"
          onClick={async () => {
            if (await confirmDialog('Delete ALL vehicles, logs and reminders? Export a backup first if you might need it.', { confirmLabel: 'Delete everything', danger: true })) {
              resetAll();
              showToast('All data deleted');
            }
          }}
        >
          Delete all data
        </button>

        <div className="about">
          <p>
            <strong>Vehicle Garage</strong> v{__APP_VERSION__}
          </p>
          <p className="muted small">Free and open source under the MIT license. No ads, no tracking, no account.</p>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="link-btn">
            <Icon name="github" size={16} /> Source code on GitHub
          </a>
        </div>
      </main>
    </div>
  );
}
