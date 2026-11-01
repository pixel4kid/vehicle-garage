import { createContext, useContext } from 'react';
import type { LogType } from './types';

export type VehicleTab = 'logs' | 'reminders' | 'stats';

export type Route =
  | { name: 'home' }
  | { name: 'vehicle'; id: string; tab: VehicleTab }
  | { name: 'vehicleForm'; id?: string }
  | { name: 'logForm'; vehicleId: string; id?: string; type?: LogType }
  | { name: 'reminderForm'; vehicleId: string; id?: string }
  | { name: 'settings' };

export interface Nav {
  push: (r: Route) => void;
  back: () => void;
  /** Replace the current route (e.g. to remember a selected tab). */
  replace: (r: Route) => void;
  /** Go back to the home screen. */
  home: () => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav outside NavContext');
  return nav;
}
