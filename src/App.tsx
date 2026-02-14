import { DashboardLayout } from './components/layout/DashboardLayout';
import { Header } from './components/sections/Header/Header';
import { PhotoSlideshow } from './components/sections/PhotoSlideshow/PhotoSlideshow';
import { WeekCalendar } from './components/sections/Calendar/WeekCalendar';
import { Electricity } from './components/sections/Electricity/Electricity';
import { Transport } from './components/sections/Transport/Transport';

function App() {
  return (
    <DashboardLayout
      header={<Header />}
      photoSlideshow={<PhotoSlideshow />}
      calendar={<WeekCalendar />}
      electricity={<Electricity />}
      transport={<Transport />}
    />
  );
}

export default App;
