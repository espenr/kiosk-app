import { Router, Route } from 'preact-router';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Header } from './components/sections/Header/Header';
import { PhotoSlideshow } from './components/sections/PhotoSlideshow/PhotoSlideshow';
import { WeekCalendar } from './components/sections/Calendar/WeekCalendar';
import { Electricity } from './components/sections/Electricity/Electricity';
import { Transport } from './components/sections/Transport/Transport';
import AdminRouter from './components/admin/AdminRouter';
import { useVersionCheck } from './hooks/useVersionCheck';
import { usePageVisibility } from './hooks/usePageVisibility';
import { useServiceRecovery } from './hooks/useServiceRecovery';

function Dashboard() {
  return (
    <DashboardLayout
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      header={<Header /> as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      photoSlideshow={<PhotoSlideshow /> as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calendar={<WeekCalendar /> as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      electricity={<Electricity /> as any}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport={<Transport /> as any}
    />
  );
}

function App() {
  // Check for version updates and reload when new version deployed
  useVersionCheck();

  // Phase 1.1: Pass Tibber connection ref for explicit reconnection on page visibility
  const getTibberConnection = () => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (window as any).__tibberConnectionRef || null;
    }
    return null;
  };

  const { checkAndRecover } = useServiceRecovery(getTibberConnection());

  usePageVisibility({
    onVisible: () => {
      console.log('[App] Page visible, checking services...');
      checkAndRecover();
    },
  });

  return (
    <Router>
      <Route path="/" component={Dashboard} />
      <Route path="/admin/:rest*" component={AdminRouter} />
    </Router>
  );
}

export default App;
