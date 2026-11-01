import { useState } from 'react';
import { deleteLog, saveLog, useData } from '../store';
import { useNav } from '../nav';
import type { LogType } from '../types';
import { Chips, Empty, Field, Header, confirmDialog, showToast } from '../components/ui';
import { LOG_TYPES, SERVICE_PRESETS, currentOdometer, formatMoney, formatNumber, num, today, unitLabel } from '../utils';

export function LogForm({ vehicleId, id, type: initialType }: { vehicleId: string; id?: string; type?: LogType }) {
  const { vehicles, logs, settings } = useData();
  const nav = useNav();
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const existing = logs.find((l) => l.id === id);

  const [type, setType] = useState<LogType>(existing?.type ?? initialType ?? 'fuel');
  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? today());
  const [odometer, setOdometer] = useState(existing?.odometer?.toString() ?? '');
  const [cost, setCost] = useState(existing?.cost?.toString() ?? '');
  const [quantity, setQuantity] = useState(existing?.quantity?.toString() ?? '');
  const [fullTank, setFullTank] = useState(existing?.fullTank ?? true);
  const [distance, setDistance] = useState(existing?.distance?.toString() ?? '');
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  if (!vehicle) {
    return (
      <div className="screen">
        <Header title="Not found" />
        <Empty emoji="🤷" title="Vehicle not found" text="It may have been deleted." />
      </div>
    );
  }

  const unit = unitLabel(vehicle.distanceUnit);
  const lastOdo = currentOdometer(vehicle, logs.filter((l) => l.id !== id));
  const isFuel = type === 'fuel';
  const showPresets = type === 'service' || type === 'repair' || type === 'expense';
  const pricePerUnit = num(cost) && num(quantity) ? num(cost)! / num(quantity)! : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const odo = num(odometer);
    saveLog({
      id,
      vehicleId,
      type,
      date: date || today(),
      title: title.trim() || (isFuel ? 'Fuel' : LOG_TYPES.find((t) => t.value === type)!.label),
      odometer: odo,
      cost: num(cost),
      quantity: isFuel ? num(quantity) : undefined,
      fullTank: isFuel ? fullTank : undefined,
      distance: type === 'trip' ? num(distance) : undefined,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
    });
    showToast(existing ? 'Log updated' : 'Log saved');
    nav.back();
  };

  const remove = async () => {
    if (!existing) return;
    if (!(await confirmDialog('Delete this log?', { confirmLabel: 'Delete', danger: true }))) return;
    deleteLog(existing.id);
    showToast('Log deleted');
    nav.back();
  };

  const odoNum = num(odometer);
  const odoWarning = odoNum != null && lastOdo != null && odoNum < lastOdo && !existing ? `Lower than the last reading (${formatNumber(lastOdo)} ${unit})` : undefined;

  return (
    <div className="screen">
      <Header title={existing ? 'Edit log' : 'New log'} subtitle={vehicle.name} />
      <form className="content form" onSubmit={submit}>
        <Field label="Type">
          <Chips options={LOG_TYPES} value={type} onChange={setType} />
        </Field>
        {!isFuel && (
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === 'trip' ? 'Weekend ride to the coast' : 'What was done?'} list={showPresets ? 'presets' : undefined} />
            {showPresets && (
              <datalist id="presets">
                {SERVICE_PRESETS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            )}
          </Field>
        )}
        {showPresets && !title && (
          <div className="chips scroll">
            {SERVICE_PRESETS.slice(0, 8).map((p) => (
              <button type="button" key={p} className="chip" onClick={() => setTitle(p)}>
                {p}
              </button>
            ))}
          </div>
        )}
        <div className="grid-2">
          <Field label="Date">
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
          <Field label={vehicle.distanceUnit === 'h' ? 'Engine hours' : `Odometer (${unit})`} hint={odoWarning ?? (lastOdo != null ? `Last: ${formatNumber(lastOdo)}` : undefined)}>
            <input value={odometer} onChange={(e) => setOdometer(e.target.value)} inputMode="decimal" placeholder={lastOdo != null ? String(lastOdo) : ''} />
          </Field>
        </div>
        {isFuel && (
          <div className="grid-2">
            <Field label={`Quantity (${vehicle.fuelUnit})`}>
              <input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="decimal" />
            </Field>
            <Field label={`Total cost (${settings.currency})`} hint={pricePerUnit ? `${formatMoney(pricePerUnit, settings.currency)}/${vehicle.fuelUnit}` : undefined}>
              <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" />
            </Field>
          </div>
        )}
        {isFuel && (
          <label className="toggle">
            <input type="checkbox" checked={fullTank} onChange={(e) => setFullTank(e.target.checked)} />
            <span>
              Filled the tank completely
              <small>Used to calculate accurate fuel economy</small>
            </span>
          </label>
        )}
        {!isFuel && type !== 'note' && (
          <Field label={`Cost (${settings.currency})`}>
            <input value={cost} onChange={(e) => setCost(e.target.value)} inputMode="decimal" placeholder="Optional" />
          </Field>
        )}
        {type === 'trip' && (
          <Field label={`Trip distance (${unit})`}>
            <input value={distance} onChange={(e) => setDistance(e.target.value)} inputMode="decimal" />
          </Field>
        )}
        <Field label={isFuel ? 'Station' : type === 'trip' ? 'Route / destination' : 'Place / shop'}>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Parts used, brand of oil, anything" />
        </Field>
        <div className="form-actions">
          <button type="submit" className="btn primary block">
            {existing ? 'Save changes' : 'Save log'}
          </button>
          {existing && (
            <button type="button" className="btn danger-ghost block" onClick={remove}>
              Delete log
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
