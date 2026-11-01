import { useData } from '../store';
import { useNav } from '../nav';
import { Empty, Fab, Header, IconButton } from '../components/ui';
import {
  compareReminderState,
  currentOdometer,
  formatMoney,
  formatNumber,
  reminderStatus,
  unitLabel,
  vehicleEmoji,
  vehicleStats,
} from '../utils';

export function HomeScreen() {
  const data = useData();
  const nav = useNav();
  const { vehicles, logs, reminders, settings } = data;

  const totalMonth = vehicles.reduce((s, v) => s + vehicleStats(v, logs).monthCost, 0);

  return (
    <div className="screen">
      <Header
        title="Garage"
        subtitle={vehicles.length ? `${vehicles.length} vehicle${vehicles.length === 1 ? '' : 's'} · ${formatMoney(totalMonth, settings.currency)} this month` : undefined}
        back={false}
        actions={<IconButton icon="settings" label="Settings" onClick={() => nav.push({ name: 'settings' })} />}
      />
      <main className="content">
        {vehicles.length === 0 ? (
          <Empty
            emoji="🏁"
            title="Your garage is empty"
            text="Add a car, bike, truck, boat or anything else to start logging fuel, services and expenses."
            action={
              <button className="btn primary" onClick={() => nav.push({ name: 'vehicleForm' })}>
                Add your first vehicle
              </button>
            }
          />
        ) : (
          <div className="vehicle-list">
            {vehicles.map((v) => {
              const odo = currentOdometer(v, logs);
              const due = reminders
                .filter((r) => r.vehicleId === v.id)
                .map((r) => ({ r, s: reminderStatus(r, odo, v.distanceUnit) }))
                .filter((x) => x.s.state === 'overdue' || x.s.state === 'soon')
                .sort((a, b) => compareReminderState(a.s.state, b.s.state));
              const stats = vehicleStats(v, logs);
              const sub = [v.year, v.make, v.model].filter(Boolean).join(' ');
              return (
                <button
                  key={v.id}
                  className="vehicle-card"
                  style={{ '--accent': v.color } as React.CSSProperties}
                  onClick={() => nav.push({ name: 'vehicle', id: v.id, tab: 'logs' })}
                >
                  <div className="vehicle-avatar">{vehicleEmoji(v.type)}</div>
                  <div className="vehicle-info">
                    <h2>{v.name}</h2>
                    {sub && <p>{sub}</p>}
                    <div className="vehicle-meta">
                      {odo != null && (
                        <span>
                          {formatNumber(odo)} {unitLabel(v.distanceUnit)}
                        </span>
                      )}
                      {v.plate && <span className="plate">{v.plate}</span>}
                      <span>{formatMoney(stats.monthCost, settings.currency)} this month</span>
                    </div>
                    {due.length > 0 && (
                      <div className={'badge ' + due[0].s.state}>
                        {due[0].s.state === 'overdue' ? '⚠️' : '⏰'} {due[0].r.title}: {due[0].s.label}
                        {due.length > 1 && ` (+${due.length - 1})`}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
      {vehicles.length > 0 && <Fab label="Vehicle" onClick={() => nav.push({ name: 'vehicleForm' })} />}
    </div>
  );
}
