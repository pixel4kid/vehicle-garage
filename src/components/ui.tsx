import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Icon, type IconName } from './Icon';
import { useNav } from '../nav';

export function Header({
  title,
  subtitle,
  back = true,
  actions,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  actions?: ReactNode;
}) {
  const nav = useNav();
  return (
    <header className="header">
      {back && (
        <button className="icon-btn" onClick={nav.back} aria-label="Back">
          <Icon name="back" />
        </button>
      )}
      <div className="header-title">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-actions">{actions}</div>
    </header>
  );
}

export function IconButton({ icon, label, onClick }: { icon: IconName; label: string; onClick: () => void }) {
  return (
    <button className="icon-btn" onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} />
    </button>
  );
}

export function Fab({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="fab" onClick={onClick}>
      <Icon name="plus" />
      <span>{label}</span>
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; emoji?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="chips" role="radiogroup">
      {options.map((o) => (
        <button
          type="button"
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          className={'chip' + (value === o.value ? ' active' : '')}
          onClick={() => onChange(o.value)}
        >
          {o.emoji && <span>{o.emoji}</span>}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Empty({ emoji, title, text, action }: { emoji: string; title: string; text: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-emoji">{emoji}</div>
      <h2>{title}</h2>
      <p>{text}</p>
      {action}
    </div>
  );
}

// ---- Confirm dialog & toast (global, promise-based) ----

interface DialogState {
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
}

let dialog: DialogState | null = null;
let toast: { id: number; text: string } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function confirmDialog(message: string, opts: { confirmLabel?: string; danger?: boolean } = {}): Promise<boolean> {
  return new Promise((resolve) => {
    dialog = { message, confirmLabel: opts.confirmLabel ?? 'OK', danger: opts.danger ?? false, resolve };
    emit();
  });
}

export function showToast(text: string) {
  toast = { id: Date.now(), text };
  emit();
}

export function closeDialog(ok = false) {
  if (!dialog) return false;
  dialog.resolve(ok);
  dialog = null;
  emit();
  return true;
}

export function OverlayHost() {
  const d = useSyncExternalStore(subscribe, () => dialog);
  const t = useSyncExternalStore(subscribe, () => toast);
  const [visibleToast, setVisibleToast] = useState<string | null>(null);

  useEffect(() => {
    if (!t) return;
    setVisibleToast(t.text);
    const timer = setTimeout(() => setVisibleToast(null), 2200);
    return () => clearTimeout(timer);
  }, [t]);

  return (
    <>
      {d && (
        <div className="backdrop" onClick={() => closeDialog(false)}>
          <div className="dialog" role="alertdialog" onClick={(e) => e.stopPropagation()}>
            <p>{d.message}</p>
            <div className="dialog-actions">
              <button className="btn ghost" onClick={() => closeDialog(false)}>
                Cancel
              </button>
              <button className={'btn ' + (d.danger ? 'danger' : 'primary')} onClick={() => closeDialog(true)}>
                {d.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      {visibleToast && <div className="toast">{visibleToast}</div>}
    </>
  );
}
