import type { DistanceUnit, LogEntry, LogType, Reminder, Vehicle, VehicleType } from './types';

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/** Today's local date as YYYY-MM-DD. */
export function today(): string {
  const d = new Date();
  return toIsoDate(d);
}

function toIsoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date: string, days: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);
}

export function formatDate(s: string): string {
  return parseDate(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMonth(key: string): string {
  return parseDate(key + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function formatMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(n);
  } catch {
    return `${n.toFixed(2)} ${currency}`;
  }
}

export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function unitLabel(u: DistanceUnit): string {
  return u === 'h' ? 'hrs' : u;
}

/** Parses a form input into a number, or undefined when empty/invalid. */
export function num(s: string): number | undefined {
  if (s.trim() === '') return undefined;
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

// ---- Labels ----

export const VEHICLE_TYPES: { value: VehicleType; label: string; emoji: string }[] = [
  { value: 'car', label: 'Car', emoji: '🚗' },
  { value: 'motorcycle', label: 'Motorcycle', emoji: '🏍️' },
  { value: 'scooter', label: 'Scooter', emoji: '🛵' },
  { value: 'truck', label: 'Truck', emoji: '🚚' },
  { value: 'van', label: 'Van', emoji: '🚐' },
  { value: 'bicycle', label: 'Bicycle', emoji: '🚲' },
  { value: 'boat', label: 'Boat', emoji: '🚤' },
  { value: 'tractor', label: 'Tractor', emoji: '🚜' },
  { value: 'other', label: 'Other', emoji: '🛞' },
];

export const vehicleEmoji = (t: VehicleType) => VEHICLE_TYPES.find((x) => x.value === t)?.emoji ?? '🛞';

export const LOG_TYPES: { value: LogType; label: string; emoji: string; color: string }[] = [
  { value: 'fuel', label: 'Fuel', emoji: '⛽', color: '#f59e0b' },
  { value: 'service', label: 'Service', emoji: '🔧', color: '#3b82f6' },
  { value: 'repair', label: 'Repair', emoji: '🛠️', color: '#ef4444' },
  { value: 'expense', label: 'Expense', emoji: '💳', color: '#a855f7' },
  { value: 'trip', label: 'Trip', emoji: '🗺️', color: '#10b981' },
  { value: 'note', label: 'Note', emoji: '📝', color: '#64748b' },
  { value: 'other', label: 'Other', emoji: '📌', color: '#14b8a6' },
];

export const logMeta = (t: LogType) => LOG_TYPES.find((x) => x.value === t) ?? LOG_TYPES[LOG_TYPES.length - 1];

export const ACCENT_COLORS = ['#f97316', '#ef4444', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#94a3b8'];

export const SERVICE_PRESETS = [
  'Oil change',
  'Oil filter',
  'Air filter',
  'Tyre change',
  'Tyre rotation',
  'Brake pads',
  'Chain clean & lube',
  'Battery',
  'Coolant',
  'Spark plugs',
  'Wash',
  'Inspection',
  'Insurance',
  'Registration',
];

// ---- Calculations ----

export function vehicleLogs(vehicleId: string, logs: LogEntry[]): LogEntry[] {
  return logs
    .filter((l) => l.vehicleId === vehicleId)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.odometer ?? 0) - (a.odometer ?? 0) || b.createdAt.localeCompare(a.createdAt));
}

export function currentOdometer(v: Vehicle, logs: LogEntry[]): number | undefined {
  let max = v.startOdometer;
  for (const l of logs) {
    if (l.vehicleId === v.id && l.odometer != null && (max == null || l.odometer > max)) max = l.odometer;
  }
  return max;
}

export interface EconomyPoint {
  date: string;
  value: number;
}

/**
 * Full-to-full fuel economy: between two full-tank fills, distance driven divided by
 * all fuel added after the first fill (including the second). Returns distance per fuel unit.
 */
export function fuelEconomy(vehicleId: string, logs: LogEntry[]): { avg?: number; points: EconomyPoint[] } {
  const fills = logs
    .filter((l) => l.vehicleId === vehicleId && l.type === 'fuel' && l.odometer != null && l.quantity)
    .sort((a, b) => a.odometer! - b.odometer!);
  const points: EconomyPoint[] = [];
  let totalDist = 0;
  let totalQty = 0;
  let lastFull: LogEntry | undefined;
  let qty = 0;
  for (const f of fills) {
    if (lastFull) qty += f.quantity!;
    if (f.fullTank) {
      if (lastFull && qty > 0) {
        const dist = f.odometer! - lastFull.odometer!;
        if (dist > 0) {
          points.push({ date: f.date, value: dist / qty });
          totalDist += dist;
          totalQty += qty;
        }
      }
      lastFull = f;
      qty = 0;
    }
  }
  return { avg: totalQty > 0 ? totalDist / totalQty : undefined, points };
}

export function economyLabel(v: Vehicle): string {
  if (v.distanceUnit === 'h') return `hrs/${v.fuelUnit}`;
  if (v.distanceUnit === 'mi' && v.fuelUnit === 'gal') return 'mpg';
  return `${v.distanceUnit}/${v.fuelUnit}`;
}

export interface VehicleStats {
  totalCost: number;
  yearCost: number;
  monthCost: number;
  byType: { type: LogType; total: number }[];
  monthly: { key: string; total: number }[];
  distanceTracked?: number;
  costPerDistance?: number;
  fuelQuantity: number;
  fuelCost: number;
  economy?: number;
  logCount: number;
}

export function vehicleStats(v: Vehicle, allLogs: LogEntry[]): VehicleStats {
  const logs = allLogs.filter((l) => l.vehicleId === v.id);
  const now = today();
  const year = now.slice(0, 4);
  const month = now.slice(0, 7);
  const byType = new Map<LogType, number>();
  const monthly = new Map<string, number>();

  // Last 12 month buckets, oldest first
  const d = parseDate(month + '-01');
  const keys: string[] = [];
  for (let i = 11; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    keys.push(toIsoDate(m).slice(0, 7));
  }
  keys.forEach((k) => monthly.set(k, 0));

  let totalCost = 0;
  let yearCost = 0;
  let monthCost = 0;
  let fuelQuantity = 0;
  let fuelCost = 0;
  let minOdo: number | undefined = v.startOdometer;
  let maxOdo: number | undefined = v.startOdometer;

  for (const l of logs) {
    const c = l.cost ?? 0;
    totalCost += c;
    if (l.date.startsWith(year)) yearCost += c;
    if (l.date.startsWith(month)) monthCost += c;
    byType.set(l.type, (byType.get(l.type) ?? 0) + c);
    const mk = l.date.slice(0, 7);
    if (monthly.has(mk)) monthly.set(mk, monthly.get(mk)! + c);
    if (l.type === 'fuel') {
      fuelQuantity += l.quantity ?? 0;
      fuelCost += c;
    }
    if (l.odometer != null) {
      if (minOdo == null || l.odometer < minOdo) minOdo = l.odometer;
      if (maxOdo == null || l.odometer > maxOdo) maxOdo = l.odometer;
    }
  }

  const distanceTracked = minOdo != null && maxOdo != null && maxOdo > minOdo ? maxOdo - minOdo : undefined;

  return {
    totalCost,
    yearCost,
    monthCost,
    byType: [...byType.entries()]
      .map(([type, total]) => ({ type, total }))
      .filter((x) => x.total > 0)
      .sort((a, b) => b.total - a.total),
    monthly: keys.map((key) => ({ key, total: monthly.get(key)! })),
    distanceTracked,
    costPerDistance: distanceTracked ? totalCost / distanceTracked : undefined,
    fuelQuantity,
    fuelCost,
    economy: fuelEconomy(v.id, logs).avg,
    logCount: logs.length,
  };
}

export type ReminderState = 'overdue' | 'soon' | 'ok' | 'done';

export function reminderStatus(r: Reminder, odo: number | undefined, unit: DistanceUnit): { state: ReminderState; label: string } {
  if (r.done) return { state: 'done', label: 'Done' };
  const parts: string[] = [];
  let state: ReminderState = 'ok';
  const bump = (s: ReminderState) => {
    if (s === 'overdue' || (s === 'soon' && state === 'ok')) state = s;
  };

  if (r.dueDate) {
    const days = daysBetween(today(), r.dueDate);
    if (days < 0) {
      bump('overdue');
      parts.push(`${-days} day${days === -1 ? '' : 's'} overdue`);
    } else if (days === 0) {
      bump('soon');
      parts.push('Due today');
    } else {
      if (days <= 14) bump('soon');
      parts.push(`in ${days} day${days === 1 ? '' : 's'}`);
    }
  }
  if (r.dueOdometer != null && odo != null) {
    const left = r.dueOdometer - odo;
    const soonAt = unit === 'h' ? 10 : unit === 'mi' ? 300 : 500;
    if (left < 0) {
      bump('overdue');
      parts.push(`${formatNumber(-left)} ${unitLabel(unit)} over`);
    } else {
      if (left <= soonAt) bump('soon');
      parts.push(`${formatNumber(left)} ${unitLabel(unit)} left`);
    }
  } else if (r.dueOdometer != null) {
    parts.push(`at ${formatNumber(r.dueOdometer)} ${unitLabel(unit)}`);
  }
  return { state, label: parts.join(' · ') || 'No due date' };
}

const STATE_ORDER: Record<ReminderState, number> = { overdue: 0, soon: 1, ok: 2, done: 3 };
export const compareReminderState = (a: ReminderState, b: ReminderState) => STATE_ORDER[a] - STATE_ORDER[b];
