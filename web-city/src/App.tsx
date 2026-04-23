import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Layout from './components/Layout';
import Home from './pages/Home';
import Locations from './pages/Locations';
import LocationDetail from './pages/LocationDetail';
import EventDetail from './pages/EventDetail';
import Events from './pages/Events';
import News from './pages/News';
import NewsDetail from './pages/NewsDetail';
import Attractions from './pages/Attractions';
import AttractionDetail from './pages/AttractionDetail';
import Emergency from './pages/Emergency';
import DownloadApp from './pages/DownloadApp';
import About from './pages/About';
import Contact from './pages/Contact';
import NotFound from './pages/NotFound';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

const DEFAULT_DESC = 'Sve o Gradačacu na jednom mjestu — restorani, marketi, događaji, znamenitosti, hitni brojevi i gradske vijesti.';

export default function App() {
  return (
    <BrowserRouter basename={BASE}>
      {/* Default meta tags - overridden by individual page SEOHead components */}
      <Helmet defaultTitle="Gradačac Mapa">
        <meta name="description" content={DEFAULT_DESC} />
        <meta property="og:title" content="Gradačac Mapa - Digitalni vodič kroz grad" />
        <meta property="og:description" content={DEFAULT_DESC} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Gradačac Mapa" />
        <meta property="og:locale" content="bs_BA" />
        <meta name="twitter:card" content="summary_large_image" />
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Gradačac Mapa',
          description: DEFAULT_DESC,
          inLanguage: 'bs',
          about: { '@type': 'City', name: 'Gradačac', address: { '@type': 'PostalAddress', addressCountry: 'BA' } },
        })}</script>
      </Helmet>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="lokacije" element={<Locations />} />
          <Route path="lokacije/:id" element={<LocationDetail />} />
          <Route path="dogadjaji" element={<Events />} />
          <Route path="dogadjaji/:id" element={<EventDetail />} />
          <Route path="vijesti" element={<News />} />
          <Route path="vijesti/:id" element={<NewsDetail />} />
          <Route path="znamenitosti" element={<Attractions />} />
          <Route path="znamenitosti/:id" element={<AttractionDetail />} />
          <Route path="hitni-brojevi" element={<Emergency />} />
          <Route path="preuzmi-app" element={<DownloadApp />} />
          <Route path="o-aplikaciji" element={<About />} />
          <Route path="kontakt" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
