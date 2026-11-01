import { Capacitor } from '@capacitor/core';
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { getData, normalize, replaceAll } from './store';
import { logMeta, today } from './utils';

/** Saves a text file: shares it on Android, downloads it in the browser. */
async function saveFile(filename: string, contents: string, mime: string) {
  if (Capacitor.isNativePlatform()) {
    const res = await Filesystem.writeFile({
      path: filename,
      data: contents,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    await Share.share({ title: filename, files: [res.uri] });
    return;
  }
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportJson() {
  await saveFile(`vehicle-garage-backup-${today()}.json`, JSON.stringify(getData(), null, 2), 'application/json');
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function exportCsv() {
  const { vehicles, logs } = getData();
  const names = new Map(vehicles.map((v) => [v.id, v.name]));
  const header = ['Vehicle', 'Date', 'Type', 'Title', 'Odometer', 'Cost', 'Quantity', 'Full tank', 'Distance', 'Location', 'Notes'];
  const rows = [...logs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => [
      names.get(l.vehicleId) ?? '',
      l.date,
      logMeta(l.type).label,
      l.title,
      l.odometer,
      l.cost,
      l.quantity,
      l.type === 'fuel' ? (l.fullTank ? 'yes' : 'no') : '',
      l.distance,
      l.location,
      l.notes,
    ]);
  const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
  await saveFile(`vehicle-garage-logs-${today()}.csv`, csv, 'text/csv');
}

export async function importJson(file: File) {
  const text = await file.text();
  replaceAll(normalize(JSON.parse(text)));
}
