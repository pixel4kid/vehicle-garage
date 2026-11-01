import { useSyncExternalStore } from 'react';
import type { Data, LogEntry, Reminder, Settings, Vehicle } from './types';
import { addDays, today, uid } from './utils';

const STORAGE_KEY = 'vehicle-garage:data';

const emptyData = (): Data => ({
  version: 1,
  vehicles: [],
  logs: [],
  reminders: [],
  settings: { currency: 'USD', theme: 'system' },
});

function load(): Data {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData();
    return normalize(JSON.parse(raw));
  } catch {
    return emptyData();
  }
}

/** Accepts unknown JSON (from storage or an imported backup) and returns valid Data. */
export function normalize(input: unknown): Data {
  const base = emptyData();
  if (!input || typeof input !== 'object') throw new Error('Not a Vehicle Garage backup');
  const obj = input as Partial<Data>;
  if (!Array.isArray(obj.vehicles) || !Array.isArray(obj.logs)) {
    throw new Error('Not a Vehicle Garage backup');
  }
  return {
    version: 1,
    vehicles: obj.vehicles,
    logs: obj.logs,
    reminders: Array.isArray(obj.reminders) ? obj.reminders : [],
    settings: { ...base.settings, ...(obj.settings ?? {}) },
  };
}

let data: Data = load();
const listeners = new Set<() => void>();

function commit(next: Data) {
  data = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data', e);
  }
  listeners.forEach((l) => l());
}

export function useData(): Data {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => data,
  );
}

export const getData = () => data;

// ---- Vehicles ----

export function saveVehicle(v: Omit<Vehicle, 'id' | 'createdAt'> & { id?: string }): Vehicle {
  const existing = v.id ? data.vehicles.find((x) => x.id === v.id) : undefined;
  const vehicle: Vehicle = existing
    ? { ...existing, ...v, id: existing.id }
    : { ...v, id: uid(), createdAt: new Date().toISOString() };
  commit({
    ...data,
    vehicles: existing
      ? data.vehicles.map((x) => (x.id === vehicle.id ? vehicle : x))
      : [...data.vehicles, vehicle],
  });
  return vehicle;
}

export function deleteVehicle(id: string) {
  commit({
    ...data,
    vehicles: data.vehicles.filter((v) => v.id !== id),
    logs: data.logs.filter((l) => l.vehicleId !== id),
    reminders: data.reminders.filter((r) => r.vehicleId !== id),
  });
}

// ---- Logs ----

export function saveLog(l: Omit<LogEntry, 'id' | 'createdAt'> & { id?: string }) {
  const existing = l.id ? data.logs.find((x) => x.id === l.id) : undefined;
  const log: LogEntry = existing
    ? { ...existing, ...l, id: existing.id }
    : { ...l, id: uid(), createdAt: new Date().toISOString() };
  commit({
    ...data,
    logs: existing ? data.logs.map((x) => (x.id === log.id ? log : x)) : [...data.logs, log],
  });
}

export function deleteLog(id: string) {
  commit({ ...data, logs: data.logs.filter((l) => l.id !== id) });
}

// ---- Reminders ----

export function saveReminder(r: Omit<Reminder, 'id' | 'createdAt' | 'done'> & { id?: string; done?: boolean }) {
  const existing = r.id ? data.reminders.find((x) => x.id === r.id) : undefined;
  const reminder: Reminder = existing
    ? { ...existing, ...r, id: existing.id, done: r.done ?? existing.done }
    : { ...r, id: uid(), done: false, createdAt: new Date().toISOString() };
  commit({
    ...data,
    reminders: existing
      ? data.reminders.map((x) => (x.id === reminder.id ? reminder : x))
      : [...data.reminders, reminder],
  });
}

/** Marks a reminder done. Repeating reminders roll forward from today / the current odometer. */
export function completeReminder(id: string, currentOdometer?: number) {
  const r = data.reminders.find((x) => x.id === id);
  if (!r) return;
  const repeats = r.repeatDays || r.repeatDistance;
  const next: Reminder = repeats
    ? {
        ...r,
        dueDate: r.repeatDays ? addDays(today(), r.repeatDays) : r.dueDate,
        dueOdometer:
          r.repeatDistance && currentOdometer != null
            ? currentOdometer + r.repeatDistance
            : r.dueOdometer,
      }
    : { ...r, done: true };
  commit({ ...data, reminders: data.reminders.map((x) => (x.id === id ? next : x)) });
}

export function deleteReminder(id: string) {
  commit({ ...data, reminders: data.reminders.filter((r) => r.id !== id) });
}

// ---- Settings & backup ----

export function saveSettings(s: Partial<Settings>) {
  commit({ ...data, settings: { ...data.settings, ...s } });
}

export function replaceAll(next: Data) {
  commit(normalize(next));
}

export function resetAll() {
  commit({ ...emptyData(), settings: data.settings });
}
