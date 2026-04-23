import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Locations from './pages/Locations';
import LocationDetail from './pages/LocationDetail';
import Events from './pages/Events';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Attractions from './pages/Attractions';
import AttractionDetail from './pages/AttractionDetail';
import Emergency from './pages/Emergency';
import DownloadApp from './pages/DownloadApp';
import About from './pages/About';
import Contact from './pages/Contact';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="lokacije" element={<Locations />} />
          <Route path="lokacije/:id" element={<LocationDetail />} />
          <Route path="dogadjaji" element={<Events />} />
          <Route path="vijesti" element={<News />} />
          <Route path="vijesti/:id" element={<NewsDetail />} />
          <Route path="znamenitosti" element={<Attractions />} />
          <Route path="znamenitosti/:id" element={<AttractionDetail />} />
          <Route path="hitni-brojevi" element={<Emergency />} />
          <Route path="preuzmi-app" element={<DownloadApp />} />
          <Route path="o-aplikaciji" element={<About />} />
          <Route path="kontakt" element={<Contact />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
