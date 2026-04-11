# Gradačac Mapa Grada - PRD

## Opis projekta
Mobilna aplikacija za grad Gradačac, Bosna i Hercegovina. Interaktivna mapa grada sa GPS integracijom, kategorijama lokacija i detaljima o svakom mjestu.

## Verzija: 1.0 (Prototip)

## Funkcionalnosti

### Backend (FastAPI + MongoDB)
- **GET /api/categories** - 6 kategorija (Restorani, Marketi, Auto Servisi, Kafići, Ljekarne, Benzinske)
- **GET /api/locations** - Sve lokacije (16 seedanih)
- **GET /api/locations?category=X** - Filtriranje po kategoriji
- **GET /api/search?q=X** - Pretraga po imenu ili adresi
- **POST /api/locations** - Kreiranje nove lokacije
- **DELETE /api/locations/{id}** - Brisanje lokacije
- Automatsko seedanje baze sa 16 lokacija za Gradačac

### Frontend (Expo React Native)
- **Interaktivna mapa** - Leaflet/OpenStreetMap sa markerima u boji po kategoriji
- **Search bar** - Pretraga lokacija po imenu ili adresi
- **Kategorije** - Horizontalni scroll chip-ovi za filtriranje
- **Lista lokacija** - Kartice sa imenom, adresom i radnim vremenom
- **Detail modal** - Detalji lokacije sa dugmadima za poziv i navigaciju
- **GPS** - Lokacija korisnika na mapi
- **Kontrole mape** - Centriraj na korisnika, centriraj na grad

## Tehnički stack
- Backend: FastAPI, Motor (MongoDB async), Pydantic
- Frontend: Expo SDK 54, React Native, Leaflet maps, expo-location
- Database: MongoDB
- Dizajn: Organic & Earthy tema (Outfit + Manrope fontovi)

## Buduće nadogradnje
- Korisničke ocjene i recenzije
- Dodavanje novih lokacija od strane korisnika
- Slike lokacija
- Radno vrijeme - otvoreno/zatvoreno status
- Push notifikacije za posebne ponude
- Offline mapa
