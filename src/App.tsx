import { Router, Route } from 'preact-router';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { Header } from './components/sections/Header/Header';
import { PhotoSlideshow } from './components/sections/PhotoSlideshow/PhotoSlideshow';
import { WeekCalendar } from './components/sections/Calendar/WeekCalendar';
import { Electricity } from './components/sections/Electricity/Electricity';
import { Transport } from './components/sections/Transport/Transport';
import AdminRouter from './components/admin/AdminRouter';

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
  return (
    <Router>
      <Route path="/" component={Dashboard} />
      <Route path="/admin/:rest*" component={AdminRouter} />
    </Router>
  );
}

export default App;
