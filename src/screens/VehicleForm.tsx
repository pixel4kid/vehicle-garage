import { useState } from 'react';
import { deleteVehicle, saveVehicle, useData } from '../store';
import { useNav } from '../nav';
import type { DistanceUnit, FuelUnit, VehicleType } from '../types';
import { Chips, Field, Header, confirmDialog, showToast } from '../components/ui';
import { ACCENT_COLORS, VEHICLE_TYPES, num } from '../utils';

export function VehicleForm({ id }: { id?: string }) {
  const { vehicles } = useData();
  const nav = useNav();
  const existing = vehicles.find((v) => v.id === id);

  const [type, setType] = useState<VehicleType>(existing?.type ?? 'car');
  const [name, setName] = useState(existing?.name ?? '');
  const [make, setMake] = useState(existing?.make ?? '');
  const [model, setModel] = useState(existing?.model ?? '');
  const [year, setYear] = useState(existing?.year?.toString() ?? '');
  const [plate, setPlate] = useState(existing?.plate ?? '');
  const [vin, setVin] = useState(existing?.vin ?? '');
  const [color, setColor] = useState(existing?.color ?? ACCENT_COLORS[vehicles.length % ACCENT_COLORS.length]);
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>(existing?.distanceUnit ?? 'km');
  const [fuelUnit, setFuelUnit] = useState<FuelUnit>(existing?.fuelUnit ?? 'L');
  const [startOdometer, setStartOdometer] = useState(existing?.startOdometer?.toString() ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');

  const fallbackName = [make, model].filter(Boolean).join(' ') || VEHICLE_TYPES.find((t) => t.value === type)!.label;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = saveVehicle({
      id,
      type,
      name: name.trim() || fallbackName,
      make: make.trim() || undefined,
      model: model.trim() || undefined,
      year: num(year),
      plate: plate.trim() || undefined,
      vin: vin.trim() || undefined,
      color,
      distanceUnit,
      fuelUnit,
      startOdometer: num(startOdometer),
      notes: notes.trim() || undefined,
    });
    showToast(existing ? 'Vehicle updated' : 'Vehicle added');
    if (existing) nav.back();
    else nav.replace({ name: 'vehicle', id: v.id, tab: 'logs' });
  };

  const remove = async () => {
    if (!existing) return;
    const ok = await confirmDialog(`Delete "${existing.name}" and all of its logs and reminders? This can't be undone.`, {
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    deleteVehicle(existing.id);
    showToast('Vehicle deleted');
    nav.home();
  };

  return (
    <div className="screen">
      <Header title={existing ? 'Edit vehicle' : 'New vehicle'} />
      <form className="content form" onSubmit={submit}>
        <Field label="Type">
          <Chips options={VEHICLE_TYPES} value={type} onChange={setType} />
        </Field>
        <Field label="Name" hint="A nickname, like “Daily driver” or “Red Ducati”">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={fallbackName} autoFocus={!existing} />
        </Field>
        <div className="grid-2">
          <Field label="Make">
            <input value={make} onChange={(e) => setMake(e.target.value)} placeholder="Toyota" />
          </Field>
          <Field label="Model">
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Corolla" />
          </Field>
          <Field label="Year">
            <input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="2020" />
          </Field>
          <Field label="Plate">
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="ABC-123" />
          </Field>
        </div>
        <Field label="VIN / chassis no.">
          <input value={vin} onChange={(e) => setVin(e.target.value)} />
        </Field>
        <div className="grid-2">
          <Field label="Measure usage in">
            <select value={distanceUnit} onChange={(e) => setDistanceUnit(e.target.value as DistanceUnit)}>
              <option value="km">Kilometres</option>
              <option value="mi">Miles</option>
              <option value="h">Engine hours</option>
            </select>
          </Field>
          <Field label="Fuel unit">
            <select value={fuelUnit} onChange={(e) => setFuelUnit(e.target.value as FuelUnit)}>
              <option value="L">Litres</option>
              <option value="gal">Gallons</option>
              <option value="kWh">kWh (electric)</option>
            </select>
          </Field>
        </div>
        <Field label={distanceUnit === 'h' ? 'Current engine hours' : 'Current odometer'}>
          <input value={startOdometer} onChange={(e) => setStartOdometer(e.target.value)} inputMode="decimal" placeholder="Optional" />
        </Field>
        <Field label="Colour">
          <div className="swatches">
            {ACCENT_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={'swatch' + (c === color ? ' active' : '')}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Colour ${c}`}
              />
            ))}
          </div>
        </Field>
        <Field label="Notes">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Tyre sizes, insurance policy no., anything" />
        </Field>
        <div className="form-actions">
          <button type="submit" className="btn primary block">
            {existing ? 'Save changes' : 'Add vehicle'}
          </button>
          {existing && (
            <button type="button" className="btn danger-ghost block" onClick={remove}>
              Delete vehicle
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
