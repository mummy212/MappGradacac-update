# Gradačac City Map - PRD

## Original Problem Statement
Mobilna aplikacija - mapa grada Gradačca (Bosna i Hercegovina). Interaktivna mapa sa GPS-om, kategorijama (restorani, marketi, auto servisi, kafići, apoteke, benzinske stanice, parkinzi, prenoćišta), pretragom, detaljima lokacija, pozivima i navigacijom.

Extended requirements: QR code discounts, "nearby" push notifications, custom categories, events/attractions, admin panel, business panel, PayPal donations, ratings/reviews, image uploads.

## User Personas
- Tourists visiting Gradačac
- Local residents finding nearby services
- Business owners managing their listings
- City administrators managing all content

## Core Architecture

### Tech Stack
- **Mobile Frontend**: React Native, Expo, Expo Router, Leaflet Maps (WebView)
- **Web Panels**: React + Vite + Tailwind CSS (Admin & Business panels)
- **Backend**: FastAPI, Python, Motor (Async MongoDB)
- **Auth**: PyJWT-based authentication

### URL Structure
- Mobile app: https://gradacac-map.preview.emergentagent.com
- Backend API: /api/* (port 8001)
- Admin Panel: /api/admin-panel
- Business Panel: /api/business-panel

### Key Files
- `/app/backend/server.py` - FastAPI main (~1000 lines)
- `/app/frontend/app/index.tsx` - Tab shell (Bottom Nav)
- `/app/frontend/components/HomeTab.tsx` - Home tab UI
- `/app/frontend/components/MapTab.tsx` - Map tab (full-screen Leaflet)
- `/app/frontend/components/EventsTab.tsx` - Events/Attractions
- `/app/frontend/components/FavoritesTab.tsx` - Favorites (AsyncStorage)
- `/app/frontend/components/ProfileTab.tsx` - Profile + Easter egg
- `/app/frontend/app/location/[id].tsx` - Location detail
- `/app/frontend/app/attraction/[id].tsx` - Attraction detail
- `/app/frontend/app/admin.tsx` - Hidden Admin Panel
- `/app/frontend/app/business.tsx` - Hidden Business Panel

## DB Schema
- **locations**: {id, name, desc, lat, lng, category, address, phone, is_open, tags, price_level, images, rating, rating_count, reviews, total_spots, is_free_parking}
- **categories**: {id, name, icon, color}
- **reviews**: {id, location_id, rating, comment, created_at}
- **notifications**: {id, title, message, success, failed, created_at}
- **attractions**: {id, name, description, latitude, longitude, category}
- **events**: {id, title, description, date, location, time}
- **offers**: {id, location_id, title, description, discount, type, valid_until}
- **users**: {id, email, password_hash, role, location_id}

## What's Implemented (with dates)

### Phase 1 - Core App (Earlier sessions)
- Interactive Leaflet map in WebView with colored category markers
- 8 location categories (Restorani, Marketi, Auto Servisi, Kafići, Ljekarne, Benzinske, Parkinzi, Prenoćišta)
- Location detail pages with reviews, QR menu, gallery, navigation
- Search functionality with regex injection protection
- Pull-to-refresh on all screens

### Phase 2 - Admin & Business (Earlier sessions)
- Hidden Admin Panel (accessible via 5-tap Easter egg in About/Profile)
- Web Admin Panel (React/Vite) at /api/admin-panel
- Web Business Panel (React/Vite) at /api/business-panel with CSV import/export
- Push Notifications via Expo
- QR Code scanning and discounts
- PayPal donations (URL linking)

### Phase 3 - Performance & Compliance (Earlier sessions)
- N+1 query optimization (batch $in queries)
- Removed microphone permission for store compliance
- Dynamic category labels (Meni/Ponuda/Usluge based on business type)
- Parking nearest-sort with GPS navigation

### Phase 4 - UI Redesign (April 2026)
- Complete Home Screen redesign with Bottom Tab Navigation
- 5 tabs: Početna, Mapa, Rezervacije, Favoriti, Profil
- Hero Carousel "Danas u Gradačcu" (events + offers)
- "Blizu tebe" horizontal scroll of nearby locations
- "Posebne ponude" vertical list
- "Brzi pristup" quick access with proper tab routing
- Full-screen Map tab with overlaid search + category filter pills
- Events/Reservations tab with attraction details
- Favorites system using AsyncStorage (cross-platform)
- Profile tab with 5-tap Easter egg for panel access
- Favorite heart button on location detail pages

## Credentials
- Admin: admin@gradacac.ba / Gradacac2024!
- Business: starigrad@test.ba / Test1234!

## Integrations
- Expo Push Notifications (no key required)
- PayPal (URL linking only)

## P0/P1/P2 Backlog

### P0 (Critical)
- None currently

### P1 (High Priority)
- Custom App Icon
- Hitni brojevi & Korisni kontakti (Emergency Contacts)
- Gradske vijesti / Obavještenja (City News)

### P2 (Future)
- Digitalne Loyalty Kartice (Stamp Card)
- Multi-language Support (BS/EN)
- Stripe subscription integration
- Offline Map Tile Downloads


## Changelog

### Session 2026-04-22 (Latest)
- **P0**: Emergency Numbers CRUD in Admin Panel
  - Backend: EmergencyContact model + full CRUD endpoints
  - 13 emergency contacts seeded (Hitni Servisi, Zdravstvo, Gradska uprava, Ostale Usluge)
  - Mobile emergency.tsx fetches from API with fallback
  - Web Admin: New EmergencyContacts.tsx page
- **P1**: City News / Gradske Vijesti
  - Backend: NewsArticle model + full CRUD endpoints
  - 4 news articles seeded (Kultura, Turizam, Vijesti, Obavještenje)
  - EventsTab.tsx refactored with Gradske Vijesti section
  - Web Admin: New News.tsx page
- **P1**: Loyalty Stamp Kartice
  - New /loyalty screen with 10-stamp card UI
  - ProfileTab.tsx updated with Loyalty Kartica menu item
- All features tested: 100% pass rate (28 backend + 11 frontend tests)

### Session 2026-04-22 (Part 5 - Targeted Push Notifications)
- **Targeted Notifications System**: Complete anti-spam notification infrastructure
  - Backend: `POST /send` now filters by `target_category` + enforces 2/day rate limit (bulk MongoDB pipeline update)
  - Backend: `GET /push-stats?category=X` returns `targeted_devices`, `quiet_hours`, `current_hour_local`
  - Backend: New `PUT /push/preferences` endpoint for mobile preference sync
  - Mobile: New `/notification-settings` screen with master toggle + 3 category toggles (Vijesti/Dogadjaji/Ponude)
  - Mobile: ProfileTab has "Podešavanja obavještenja" menu item
  - Mobile: `_layout.tsx` auto-registers push token on startup with preferences
  - Admin Panel: Notifications page fully rewritten with targeting UI, quiet hours indicator (22:00-08:00), anti-spam toggle, live estimated reach
  - All 20 backend + all mobile + admin tests PASS (100%)
- **Notification Center feature**: Complete bell notification system implemented
  - `GET /api/notifications-feed` — unified feed (news + events + active offers), sorted by date
  - New screen `/app/frontend/app/notifications.tsx` — full notification center with type badges, unread dot, relative time, "Mark all read", pull-to-refresh
  - HomeTab bell icon updated: shows red badge with unread count (from AsyncStorage `notif_last_seen`), navigates to /notifications
  - Bug fixed: events use DB `created_at` timestamp, not future `date` field (prevents permanent unread state)
  - 23/24 total tests PASS (14/14 backend, 9/10 frontend)
  - Root fix: `index.tsx` now passes `handleTabChange` instead of raw `setActiveTab` to `HomeTab`
  - All 6 quick access icons verified: Događaji→Rezervacije, Restorani→Mapa+filter, Hitni br.→Emergency, Smještaj/Apoteke/Parkinzi→Mapa+filter
  - 9/9 frontend tests passed
- **Custom App Icon**: Generated icon with Gradačac fortress tower + location pin on purple gradient
  - Placed in: icon.png, adaptive-icon.png, favicon.png, splash-icon.png

## Next Tasks
- [ ] Multi-language Support (BS/EN) (P2)
- [ ] Stripe subscription integration (P1)
- [ ] Possibly a nicer/AI-generated app icon via external service

### Session 2026-04-22 (Part 2 - Offline Map)
- Automatic tile caching via IndexedDB (auto-cache as user browses)
- "Preuzmi offline" button (cloud icon next to search bar)
  - Downloads 748 tiles for Gradačac area (zoom 13-16)
  - Progress modal with real-time % counter and animated bar
  - Completion state with stats (748 tiles, Offline, 7 days cache)
  - Cancel functionality
  - Auto-pruning tiles older than 7 days
- Offline badge in map: shows "📴 Offline način" when no internet, "✅ Internet vraćen" on reconnect
