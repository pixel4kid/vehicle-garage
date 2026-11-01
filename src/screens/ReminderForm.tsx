import { useState } from 'react';
import { deleteReminder, saveReminder, useData } from '../store';
import { useNav } from '../nav';
import { Empty, Field, Header, confirmDialog, showToast } from '../components/ui';
import { SERVICE_PRESETS, currentOdometer, formatNumber, num, unitLabel } from '../utils';

export function ReminderForm({ vehicleId, id }: { vehicleId: string; id?: string }) {
  const { vehicles, logs, reminders } = useData();
  const nav = useNav();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const existing = reminders.find((r) => r.id === id);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [dueDate, setDueDate] = useState(existing?.dueDate ?? '');
  const [dueOdometer, setDueOdometer] = useState(existing?.dueOdometer?.toString() ?? '');
  const [repeatDays, setRepeatDays] = useState(existing?.repeatDays?.toString() ?? '');
  const [repeatDistance, setRepeatDistance] = useState(existing?.repeatDistance?.toString() ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState('');

  if (!vehicle) {
    return (
      <div className="screen">
        <Header title="Not found" />
        <Empty emoji="🤷" title="Vehicle not found" text="It may have been deleted." />
      </div>
    );
  }

  const unit = unitLabel(vehicle.distanceUnit);
  const odo = currentOdometer(vehicle, logs);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return setError('Give the reminder a name');
    if (!dueDate && num(dueOdometer) == null) return setError('Set a due date, a due reading, or both');
    saveReminder({
      id,
      vehicleId,
      title: title.trim(),
      dueDate: dueDate || undefined,
      dueOdometer: num(dueOdometer),
      repeatDays: num(repeatDays),
      repeatDistance: num(repeatDistance),
      notes: notes.trim() || undefined,
      done: existing ? existing.done : false,
    });
    showToast(existing ? 'Reminder updated' : 'Reminder added');
    nav.back();
  };

  const remove = async () => {
    if (!existing) return;
    if (!(await confirmDialog('Delete this reminder?', { confirmLabel: 'Delete', danger: true }))) return;
    deleteReminder(existing.id);
    showToast('Reminder deleted');
    nav.back();
  };

  return (
    <div className="screen">
      <Header title={existing ? 'Edit reminder' : 'New reminder'} subtitle={vehicle.name} />
      <form className="content form" onSubmit={submit}>
        <Field label="What">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Oil change" list="reminder-presets" autoFocus={!existing} />
          <datalist id="reminder-presets">
            {SERVICE_PRESETS.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </Field>
        <p className="section-label">Due when (either or both)</p>
        <div className="grid-2">
          <Field label="Date">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
          <Field label={`At reading (${unit})`} hint={odo != null ? `Now: ${formatNumber(odo)}` : undefined}>
            <input value={dueOdometer} onChange={(e) => setDueOdometer(e.target.value)} inputMode="decimal" />
          </Field>
        </div>
        <p className="section-label">Repeat (optional)</p>
        <div className="grid-2">
          <Field label="Every … days">
            <input value={repeatDays} onChange={(e) => setRepeatDays(e.target.value)} inputMode="numeric" placeholder="e.g. 180" />
          </Field>
          <Field label={`Every … ${unit}`}>
            <input value={repeatDistance} onChange={(e) => setRepeatDistance(e.target.value)} inputMode="decimal" placeholder={vehicle.distanceUnit === 'h' ? 'e.g. 100' : 'e.g. 5000'} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </Field>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          <button type="submit" className="btn primary block">
            {existing ? 'Save changes' : 'Add reminder'}
          </button>
          {existing && existing.done && (
            <button
              type="button"
              className="btn ghost block"
              onClick={() => {
                saveReminder({ ...existing, done: false });
                showToast('Reminder reopened');
                nav.back();
              }}
            >
              Reopen reminder
            </button>
          )}
          {existing && (
            <button type="button" className="btn danger-ghost block" onClick={remove}>
              Delete reminder
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
