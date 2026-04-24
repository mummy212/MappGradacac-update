# Gradačac Mapa - Product Requirements Document

## Original Problem Statement
Kreiraj mobilnu aplikaciju - mapu grada Gradačac (Bosna i Hercegovina) sa svim podacima o gradu, GPS integracijom, listom marketa, restorana i još mnogo toga.

Prošireno na: Detaljna, moderna, SEO-friendly web stranica i admin paneli za upravljanje svim sadržajem.

## User Personas
- **Turistički posjetilac**: Traži restorane, atrakcije, događaje
- **Stanovnik Gradačca**: Prati gradske vijesti, hitni brojevi, događaji
- **Vlasnik biznisa**: Upravlja lokacijom, menüom, ponudama
- **Administrator**: Upravlja svim sadržajem, korisnicima, CMS-om

## Architecture
- **Mobile App**: React Native, Expo, Expo Router
- **Backend**: FastAPI, Python, Motor (Async MongoDB)
- **Web Admin Panel**: React + Vite, Tailwind CSS (at /api/admin-panel/)
- **Web Business Panel**: React + Vite, Tailwind CSS (at /api/business-panel/)
- **Public City Website**: React + Vite, Tailwind CSS, react-helmet-async (at /api/city/)

## Core Requirements
1. Interaktivna mapa (Leaflet) sa svim lokacijama
2. Kategorije lokacija: restorani, market, auto servisi, kafici, apoteke, benzinske
3. GPS integracija za navigaciju
4. Admin panel za upravljanje svim sadržajem
5. Business panel za upresnike lokacija
6. Gradske vijesti, događaji, atrakcije sa bogatim sadržajem
7. Push notifikacije
8. QR kod popusti
9. Loyalty kartica
10. Hitni brojevi

## What's Been Implemented

### Faza 1: Osnovna Mobilna Aplikacija (DONE)
- Interaktivna mapa (Leaflet WebView)
- 6 kategorija sa filterima
- Pretraga lokacija
- Detalji lokacije (tel, navigacija, radno vrijeme)
- Hidden admin/business panel (5-tap na About)

### Faza 2: Web Paneli (DONE)
- Web Admin Panel (/api/admin-panel/)
- Web Business Panel (/api/business-panel/)

### Faza 3: Public Web City Guide (DONE)
- Public website (/api/city/)
- Pages: Home, Lokacije, Detalji, Dogadjaji, Vijesti, Znamenitosti, Hitni Brojevi

### Faza 4: CMS Sistem (DONE)
- cms_widgets i site_settings kolekcije
- Widgeti sa pozicijama na web stranici
- TipTap rich text editor u admin panelu

### Faza 5: Admin Upravljanje (DONE)
- GET/POST/PUT/DELETE /api/admin/admins
- Admins.tsx stranica u admin panelu

### Faza 6: Rich Content + Mobile Detail Screens (DONE)
- content_html polje (TipTap)
- Multi-image galerije
- /news/[id].tsx i /event/[id].tsx - TESTIRANO

### Faza 7: SEO Optimizacija (DONE - Apr 2026)
- `react-helmet-async` instaliran
- `SEOHead.tsx` komponenta - title, description, OG, Twitter Card, canonical, JSON-LD
- JSON-LD Structured Data po tipu stranice:
  - LocalBusiness (lokacije)
  - NewsArticle (vijesti)
  - Event (događaji)
  - TouristAttraction (znamenitosti)
  - WebSite + Organization (homepage)
- `GET /api/sitemap.xml` - dinamicki generisan sa svim URL-ovima
- `GET /api/robots.txt` - ispravno konfiguriran
- Admin panel SEO tab: Google Search Console verifikacijski kod, Google Analytics 4 ID, Kanonski URL, OG Slika, Google pretraga preview
- Nema duplicate meta tagova (staticki tagovi uklonjeni iz index.html)

### Faza 8: Mobilna Optimizacija web-city + Čišćenje Podataka (DONE - Apr 2026)
- Kreiran `MobileBottomNav.tsx` - fiksna bottom navigacija sa 5 tabova (Početna, Lokacije, Događaji, Vijesti, Hitni)
- `Layout.tsx` integriran sa MobileBottomNav i `pb-14 md:pb-0` na main elementu
- `Footer.tsx` - `pt-14 pb-24` na mobilnom, osigurava da sadržaj nije prekriven bottom navom
- `DownloadBanner.tsx` - telefon mockup skriven na xs ekranima (`hidden sm:flex`)
- `index.css` - dodane CSS klase: `safe-area-pb` (env safe-area-inset-bottom), `scrollbar-none`, tap-highlight removal
- `MobileBottomNav` - backdrop-blur-md efekt, `relative` class na Link za aktivni indikator
- Test podaci obrisani iz MongoDB (3 test ponude: TEST Admin Offer x2, TEST_Popust 20%)
- Testirano 100%: svih 8 funkcija prošle ✅

## Test Credentials
- Admin: admin@gradacac.ba / Gradacac2024!
- Business: starigrad@test.ba / Test1234!

## P0/P1/P2 Features Remaining

### P1 (Visoki prioritet)
- Stripe/PayPal integracija za premium pretplate

### P2 (Srednji prioritet)
- Offline map tile preuzimanje
- Loyalty card push podsjetnici
