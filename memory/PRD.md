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

### Admin Panel (Zaštićen pristup)
- **Login**: JWT autentikacija sa admin credentials
- **Dashboard**: Pregled svih lokacija sa statistikama
- **CRUD**: Dodaj, uredi, obriši lokacije
- **Premium oznaka**: Mogućnost označavanja lokacija kao premium (plaćena pretplata)
- **Admin rute**: /api/admin/locations (POST, PUT, DELETE) - zahtijevaju JWT token
- **Credentials**: admin@gradacac.ba / Gradacac2024!

### Detalji lokacije (Prošireno)
- **Galerija slika**: Upload slika iz galerije telefona (base64 storage)
- **Tagovi usluga**: Npr. "Ćevapi", "Roštilj", "WiFi" za svaku lokaciju
- **Nivo cijena**: €, €€, €€€
- **Opis**: Detaljniji opis lokacije
- **Ocjene korisnika**: 1-5 zvjezdica sa opcionim komentarom (bez registracije)
- **Admin moderacija**: Admin može brisati neprikladne recenzije

### Push Notifikacije
- **Registracija uređaja**: Automatska registracija push tokena pri otvaranju app
- **Admin slanje**: Admin može slati obavještenja svim korisnicima (događaji, manifestacije)
- **Isključivanje**: Korisnici mogu isključiti notifikacije
- **Expo Push Service**: Integracija sa Expo push servisom za Android i iOS
- **Historija**: Svi poslani notifikacije čuvaju se u bazi

### Verified Business Badge
- Premium lokacije sa plaćenom pretplatom imaju posebnu oznaku
- Badge vidljiv u listi lokacija i na detaljnoj stranici
- Admin može označiti lokaciju kao premium

## Buduće nadogradnje
- Korisničke ocjene i recenzije
- Dodavanje novih lokacija od strane korisnika
- Slike lokacija
- Radno vrijeme - otvoreno/zatvoreno status
- Push notifikacije za posebne ponude
- Offline mapa
