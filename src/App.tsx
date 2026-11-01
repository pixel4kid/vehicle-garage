import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { NavContext, type Nav, type Route } from './nav';
import { useData } from './store';
import { OverlayHost, closeDialog } from './components/ui';
import { HomeScreen } from './screens/HomeScreen';
import { VehicleScreen } from './screens/VehicleScreen';
import { VehicleForm } from './screens/VehicleForm';
import { LogForm } from './screens/LogForm';
import { ReminderForm } from './screens/ReminderForm';
import { SettingsScreen } from './screens/SettingsScreen';

export function App() {
  const [stack, setStack] = useState<Route[]>([{ name: 'home' }]);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const { settings } = useData();

  const nav = useMemo<Nav>(
    () => ({
      push: (r) => setStack((s) => [...s, r]),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
      replace: (r) => setStack((s) => [...s.slice(0, -1), r]),
      home: () => setStack([{ name: 'home' }]),
    }),
    [],
  );

  // Android hardware back button: close dialog, then go back, then exit.
  const onBack = useCallback(() => {
    if (closeDialog(false)) return;
    if (stackRef.current.length > 1) nav.back();
    else CapApp.exitApp();
  }, [nav]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const handle = CapApp.addListener('backButton', onBack);
    return () => {
      handle.then((h) => h.remove());
    };
  }, [onBack]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
  }, [settings.theme]);

  const top = stack[stack.length - 1];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stack.length]);

  return (
    <NavContext.Provider value={nav}>
      <Screen route={top} />
      <OverlayHost />
    </NavContext.Provider>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case 'home':
      return <HomeScreen />;
    case 'vehicle':
      return <VehicleScreen id={route.id} tab={route.tab} />;
    case 'vehicleForm':
      return <VehicleForm key={route.id ?? 'new'} id={route.id} />;
    case 'logForm':
      return <LogForm key={route.id ?? 'new'} vehicleId={route.vehicleId} id={route.id} type={route.type} />;
    case 'reminderForm':
      return <ReminderForm key={route.id ?? 'new'} vehicleId={route.vehicleId} id={route.id} />;
    case 'settings':
      return <SettingsScreen />;
  }
}
