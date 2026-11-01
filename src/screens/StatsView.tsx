import { useData } from '../store';
import type { Vehicle } from '../types';
import { Empty } from '../components/ui';
import {
  economyLabel,
  formatDate,
  formatMoney,
  formatNumber,
  fuelEconomy,
  logMeta,
  unitLabel,
  vehicleStats,
} from '../utils';

export function StatsView({ vehicle }: { vehicle: Vehicle }) {
  const { logs, settings } = useData();
  const s = vehicleStats(vehicle, logs);
  const money = (n: number) => formatMoney(n, settings.currency);
  const unit = unitLabel(vehicle.distanceUnit);

  if (s.logCount === 0) {
    return <Empty emoji="📊" title="No stats yet" text="Add some logs with costs and odometer readings to see your stats." />;
  }

  const econ = fuelEconomy(vehicle.id, logs);
  const maxMonth = Math.max(...s.monthly.map((m) => m.total), 1);
  const maxType = Math.max(...s.byType.map((t) => t.total), 1);

  return (
    <div className="stats">
      <div className="tiles">
        <Tile label="Total spent" value={money(s.totalCost)} />
        <Tile label="This year" value={money(s.yearCost)} />
        <Tile label="This month" value={money(s.monthCost)} />
        <Tile
          label={`Cost per ${unit === 'hrs' ? 'hour' : unit}`}
          value={s.costPerDistance != null ? money(s.costPerDistance) : '—'}
        />
        <Tile label={`${unit === 'hrs' ? 'Hours' : 'Distance'} tracked`} value={s.distanceTracked != null ? `${formatNumber(s.distanceTracked)} ${unit}` : '—'} />
        <Tile
          label="Avg. economy"
          value={s.economy != null ? `${formatNumber(s.economy, 1)} ${economyLabel(vehicle)}` : '—'}
          hint={
            s.economy != null && vehicle.distanceUnit === 'km' && vehicle.fuelUnit === 'L'
              ? `${formatNumber(100 / s.economy, 1)} L/100km`
              : s.economy == null && s.fuelQuantity > 0
                ? 'Needs 2+ full-tank fills'
                : undefined
          }
        />
      </div>

      <section className="card">
        <h3>Spending · last 12 months</h3>
        <div className="bars" role="img" aria-label="Monthly spending chart">
          {s.monthly.map((m) => {
            const d = new Date(m.key + '-01T00:00:00');
            return (
              <div className="bar-col" key={m.key} title={`${m.key}: ${money(m.total)}`}>
                <div className="bar-track">
                  <div className="bar" style={{ height: `${(m.total / maxMonth) * 100}%` }} />
                </div>
                <span className="bar-label">{d.toLocaleDateString(undefined, { month: 'narrow' })}</span>
              </div>
            );
          })}
        </div>
      </section>

      {s.byType.length > 0 && (
        <section className="card">
          <h3>Spending by category</h3>
          <ul className="hbars">
            {s.byType.map((t) => {
              const m = logMeta(t.type);
              return (
                <li key={t.type}>
                  <div className="hbar-head">
                    <span>
                      {m.emoji} {m.label}
                    </span>
                    <span>
                      {money(t.total)} <span className="muted">· {Math.round((t.total / s.totalCost) * 100)}%</span>
                    </span>
                  </div>
                  <div className="hbar-track">
                    <div className="hbar" style={{ width: `${(t.total / maxType) * 100}%`, background: m.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {s.fuelQuantity > 0 && (
        <section className="card">
          <h3>Fuel</h3>
          <div className="kv">
            <span>Total fuel</span>
            <span>
              {formatNumber(s.fuelQuantity, 1)} {vehicle.fuelUnit}
            </span>
            <span>Fuel cost</span>
            <span>{money(s.fuelCost)}</span>
            {s.fuelQuantity > 0 && s.fuelCost > 0 && (
              <>
                <span>Avg. price</span>
                <span>
                  {money(s.fuelCost / s.fuelQuantity)}/{vehicle.fuelUnit}
                </span>
              </>
            )}
          </div>
          {econ.points.length > 0 && (
            <>
              <h4>Recent economy</h4>
              <ul className="econ-list">
                {econ.points
                  .slice(-6)
                  .reverse()
                  .map((p, i) => (
                    <li key={i}>
                      <span>{formatDate(p.date)}</span>
                      <span>
                        {formatNumber(p.value, 1)} {economyLabel(vehicle)}
                      </span>
                    </li>
                  ))}
              </ul>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      {hint && <span className="tile-hint">{hint}</span>}
    </div>
  );
}
