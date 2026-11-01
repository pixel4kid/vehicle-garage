import { useMemo, useState, type CSSProperties } from 'react';
import { completeReminder, useData } from '../store';
import { useNav, type VehicleTab } from '../nav';
import type { LogType, Vehicle } from '../types';
import { Empty, Fab, Header, IconButton, showToast } from '../components/ui';
import { Icon } from '../components/Icon';
import { StatsView } from './StatsView';
import {
  LOG_TYPES,
  compareReminderState,
  currentOdometer,
  formatDate,
  formatMoney,
  formatMonth,
  formatNumber,
  logMeta,
  reminderStatus,
  unitLabel,
  vehicleEmoji,
  vehicleLogs,
} from '../utils';

export function VehicleScreen({ id, tab }: { id: string; tab: VehicleTab }) {
  const data = useData();
  const nav = useNav();
  const vehicle = data.vehicles.find((v) => v.id === id);

  if (!vehicle) {
    return (
      <div className="screen">
        <Header title="Not found" />
        <Empty emoji="🤷" title="Vehicle not found" text="It may have been deleted." />
      </div>
    );
  }

  const odo = currentOdometer(vehicle, data.logs);
  const sub = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const setTab = (t: VehicleTab) => nav.replace({ name: 'vehicle', id, tab: t });

  return (
    <div className="screen" style={{ '--accent': vehicle.color } as CSSProperties}>
      <Header
        title={`${vehicleEmoji(vehicle.type)} ${vehicle.name}`}
        subtitle={[sub, odo != null ? `${formatNumber(odo)} ${unitLabel(vehicle.distanceUnit)}` : ''].filter(Boolean).join(' · ')}
        actions={<IconButton icon="edit" label="Edit vehicle" onClick={() => nav.push({ name: 'vehicleForm', id })} />}
      />
      <nav className="tabs" role="tablist">
        {(
          [
            ['logs', 'Logs', 'list'],
            ['reminders', 'Reminders', 'bell'],
            ['stats', 'Stats', 'chart'],
          ] as const
        ).map(([t, label, icon]) => (
          <button key={t} role="tab" aria-selected={tab === t} className={'tab' + (tab === t ? ' active' : '')} onClick={() => setTab(t)}>
            <Icon name={icon} size={18} />
            {label}
          </button>
        ))}
      </nav>
      <main className="content">
        {tab === 'logs' && <LogsView vehicle={vehicle} />}
        {tab === 'reminders' && <RemindersView vehicle={vehicle} odo={odo} />}
        {tab === 'stats' && <StatsView vehicle={vehicle} />}
      </main>
      {tab === 'logs' && <Fab label="Log" onClick={() => nav.push({ name: 'logForm', vehicleId: id })} />}
      {tab === 'reminders' && <Fab label="Reminder" onClick={() => nav.push({ name: 'reminderForm', vehicleId: id })} />}
    </div>
  );
}

function LogsView({ vehicle }: { vehicle: Vehicle }) {
  const { logs, settings } = useData();
  const nav = useNav();
  const [filter, setFilter] = useState<LogType | 'all'>('all');
  const [query, setQuery] = useState('');

  const all = useMemo(() => vehicleLogs(vehicle.id, logs), [vehicle.id, logs]);
  const shown = all.filter((l) => {
    if (filter !== 'all' && l.type !== filter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return [l.title, l.notes, l.location].some((s) => s?.toLowerCase().includes(q));
  });

  const groups = new Map<string, typeof shown>();
  for (const l of shown) {
    const k = l.date.slice(0, 7);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(l);
  }

  if (all.length === 0) {
    return (
      <Empty
        emoji="📒"
        title="No logs yet"
        text="Log fuel fill-ups, services, repairs, expenses, trips or notes."
        action={
          <div className="quick-add">
            {LOG_TYPES.slice(0, 4).map((t) => (
              <button key={t.value} className="btn ghost" onClick={() => nav.push({ name: 'logForm', vehicleId: vehicle.id, type: t.value })}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        }
      />
    );
  }

  return (
    <>
      <div className="search">
        <Icon name="search" size={18} />
        <input placeholder="Search logs" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      <div className="chips scroll">
        <button className={'chip' + (filter === 'all' ? ' active' : '')} onClick={() => setFilter('all')}>
          All
        </button>
        {LOG_TYPES.filter((t) => all.some((l) => l.type === t.value)).map((t) => (
          <button key={t.value} className={'chip' + (filter === t.value ? ' active' : '')} onClick={() => setFilter(t.value)}>
            {t.emoji} {t.label}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="muted center">No logs match.</p>}
      {[...groups.entries()].map(([month, items]) => {
        const total = items.reduce((s, l) => s + (l.cost ?? 0), 0);
        return (
          <section key={month} className="group">
            <div className="group-head">
              <span>{formatMonth(month)}</span>
              {total > 0 && <span>{formatMoney(total, settings.currency)}</span>}
            </div>
            <ul className="list">
              {items.map((l) => {
                const m = logMeta(l.type);
                const details = [
                  formatDate(l.date),
                  l.odometer != null && `${formatNumber(l.odometer)} ${unitLabel(vehicle.distanceUnit)}`,
                  l.quantity != null && `${formatNumber(l.quantity, 2)} ${vehicle.fuelUnit}${l.type === 'fuel' && !l.fullTank ? ' (partial)' : ''}`,
                  l.distance != null && `${formatNumber(l.distance, 1)} ${unitLabel(vehicle.distanceUnit)} trip`,
                  l.location,
                ].filter(Boolean);
                return (
                  <li key={l.id}>
                    <button className="row" onClick={() => nav.push({ name: 'logForm', vehicleId: vehicle.id, id: l.id })}>
                      <span className="row-icon" style={{ background: m.color + '22', color: m.color }}>
                        {m.emoji}
                      </span>
                      <span className="row-main">
                        <span className="row-title">{l.title || m.label}</span>
                        <span className="row-sub">{details.join(' · ')}</span>
                        {l.notes && <span className="row-notes">{l.notes}</span>}
                      </span>
                      {l.cost != null && <span className="row-amount">{formatMoney(l.cost, settings.currency)}</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function RemindersView({ vehicle, odo }: { vehicle: Vehicle; odo?: number }) {
  const { reminders } = useData();
  const nav = useNav();
  const [showDone, setShowDone] = useState(false);

  const items = reminders
    .filter((r) => r.vehicleId === vehicle.id)
    .map((r) => ({ r, s: reminderStatus(r, odo, vehicle.distanceUnit) }))
    .sort((a, b) => compareReminderState(a.s.state, b.s.state) || (a.r.dueDate ?? '9').localeCompare(b.r.dueDate ?? '9'));
  const active = items.filter((x) => x.s.state !== 'done');
  const done = items.filter((x) => x.s.state === 'done');

  if (items.length === 0) {
    return (
      <Empty
        emoji="⏰"
        title="No reminders"
        text="Get reminded about oil changes, insurance, inspections and more by date or by distance."
      />
    );
  }

  const row = ({ r, s }: (typeof items)[number]) => (
    <li key={r.id}>
      <div className={'row reminder ' + s.state}>
        <button className="row-main as-button" onClick={() => nav.push({ name: 'reminderForm', vehicleId: vehicle.id, id: r.id })}>
          <span className="row-title">{r.title}</span>
          <span className="row-sub">
            {s.label}
            {r.dueDate && ` · ${formatDate(r.dueDate)}`}
            {(r.repeatDays || r.repeatDistance) && ' · repeats'}
          </span>
        </button>
        {!r.done && (
          <button
            className="check-btn"
            aria-label="Mark done"
            onClick={() => {
              completeReminder(r.id, odo);
              showToast(r.repeatDays || r.repeatDistance ? 'Done, next one scheduled' : 'Marked done');
            }}
          >
            <Icon name="check" size={18} />
          </button>
        )}
      </div>
    </li>
  );

  return (
    <>
      {active.length > 0 ? <ul className="list">{active.map(row)}</ul> : <p className="muted center">All caught up 🎉</p>}
      {done.length > 0 && (
        <>
          <button className="link-btn" onClick={() => setShowDone(!showDone)}>
            {showDone ? 'Hide' : 'Show'} completed ({done.length})
          </button>
          {showDone && <ul className="list faded">{done.map(row)}</ul>}
        </>
      )}
    </>
  );
}
