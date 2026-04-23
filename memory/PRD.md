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
- **Public City Website**: React + Vite, Tailwind CSS (at /api/city/)

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

### Faza 1: Osnovna Mobilna Aplikacija
- Interaktivna mapa (Leaflet WebView)
- 6 kategorija sa filterima
- Pretraga lokacija
- Detalji lokacije (tel, navigacija, radno vrijeme)
- Hidden admin/business panel (5-tap na About)

### Faza 2: Web Paneli
- Web Admin Panel (/api/admin-panel/)
- Web Business Panel (/api/business-panel/)

### Faza 3: Public Web City Guide
- Public website (/api/city/)
- Pages: Home, Lokacije, Detalji, Dogadjaji, Vijesti, Znamenitosti, Hitni Brojevi

### Faza 4: CMS Sistem
- cms_widgets i site_settings kolekcije
- Widgeti sa pozicijama na web stranici
- TipTap rich text editor u admin panelu

### Faza 5: Admin Upravljanje
- GET/POST/PUT/DELETE /api/admin/admins
- Admins.tsx stranica u admin panelu

### Faza 6: Rich Content za Atrakcije, Događaje, Vijesti
- content_html polje (TipTap)
- Multi-image galerije
- Detaljne stranice na web i mobilnoj aplikaciji
- /news/[id].tsx i /event/[id].tsx u mobilnoj aplikaciji (TESTOVANO - 100%)

## Test Credentials
- Admin: admin@gradacac.ba / Gradacac2024!
- Business: starigrad@test.ba / Test1234!

## P0/P1/P2 Features Remaining

### P1 (Visoki prioritet)
- SEO meta tags za /city/ detalj stranice

### P2 (Srednji prioritet)
- Stripe/PayPal integracija za premium pretplate
- Offline map tile preuzimanje
- Loyalty card push podsjetnici
