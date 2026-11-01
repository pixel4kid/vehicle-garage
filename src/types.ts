export type VehicleType =
  | 'car'
  | 'motorcycle'
  | 'scooter'
  | 'truck'
  | 'van'
  | 'bicycle'
  | 'boat'
  | 'tractor'
  | 'other';

export type DistanceUnit = 'km' | 'mi' | 'h';
export type FuelUnit = 'L' | 'gal' | 'kWh';

export interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  make?: string;
  model?: string;
  year?: number;
  plate?: string;
  vin?: string;
  color: string;
  distanceUnit: DistanceUnit;
  fuelUnit: FuelUnit;
  startOdometer?: number;
  notes?: string;
  createdAt: string;
}

export type LogType = 'fuel' | 'service' | 'repair' | 'expense' | 'trip' | 'note' | 'other';

export interface LogEntry {
  id: string;
  vehicleId: string;
  type: LogType;
  /** YYYY-MM-DD */
  date: string;
  title: string;
  odometer?: number;
  cost?: number;
  /** Fuel quantity (fuel logs) */
  quantity?: number;
  /** Tank filled completely; needed for accurate economy */
  fullTank?: boolean;
  /** Trip distance (trip logs) */
  distance?: number;
  location?: string;
  notes?: string;
  createdAt: string;
}

export interface Reminder {
  id: string;
  vehicleId: string;
  title: string;
  /** YYYY-MM-DD */
  dueDate?: string;
  dueOdometer?: number;
  repeatDays?: number;
  repeatDistance?: number;
  notes?: string;
  done: boolean;
  createdAt: string;
}

export type Theme = 'system' | 'light' | 'dark';

export interface Settings {
  currency: string;
  theme: Theme;
}

export interface Data {
  version: 1;
  vehicles: Vehicle[];
  logs: LogEntry[];
  reminders: Reminder[];
  settings: Settings;
}
