from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response, Depends, UploadFile, File
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os, logging, bcrypt, jwt, secrets, base64, math, re, csv, io
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import httpx

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ['ADMIN_EMAIL']
ADMIN_PASSWORD = os.environ['ADMIN_PASSWORD']
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ===== Uploads static files =====
UPLOADS_DIR = ROOT_DIR / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# ===== Auth Helpers =====
def hash_pw(pw: str) -> str: return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()
def verify_pw(plain: str, hashed: str) -> bool: return bcrypt.checkpw(plain.encode(), hashed.encode())
def make_token(uid: str, email: str, role: str = "user") -> str:
    return jwt.encode({"sub": uid, "email": email, "role": role, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "): token = auth[7:]
    if not token: raise HTTPException(401, "Not authenticated")
    try:
        p = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if p.get("type") != "access": raise HTTPException(401, "Invalid token")
        user = await db.users.find_one({"_id": ObjectId(p["sub"])})
        if not user: raise HTTPException(401, "User not found")
        return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name",""), "role": user.get("role","user"), "location_id": user.get("location_id","")}
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expired")
    except: raise HTTPException(401, "Invalid token")

async def require_admin(request: Request) -> dict:
    user = await get_user(request)
    if user["role"] != "admin": raise HTTPException(403, "Admin required")
    return user

async def require_business_or_admin(request: Request) -> dict:
    user = await get_user(request)
    if user["role"] not in ("admin", "business"): raise HTTPException(403, "Business or admin required")
    return user

# ===== Models =====
class Location(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str; category: str; address: str; latitude: float; longitude: float
    phone: Optional[str] = None; description: Optional[str] = None
    working_hours: Optional[str] = None; is_premium: bool = False
    images: List[str] = []; service_tags: List[str] = []
    price_level: int = 0; avg_rating: float = 0.0; review_count: int = 0
    views: int = 0; nav_clicks: int = 0; call_clicks: int = 0
    total_spots: Optional[int] = None
    is_free_parking: Optional[bool] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationCreate(BaseModel):
    name: str; category: str; address: str; latitude: float; longitude: float
    phone: Optional[str] = None; description: Optional[str] = None
    working_hours: Optional[str] = None; is_premium: bool = False
    service_tags: List[str] = []; price_level: int = 0
    total_spots: Optional[int] = None
    is_free_parking: Optional[bool] = None

class LocationUpdate(BaseModel):
    name: Optional[str] = None; category: Optional[str] = None; address: Optional[str] = None
    latitude: Optional[float] = None; longitude: Optional[float] = None
    phone: Optional[str] = None; description: Optional[str] = None
    working_hours: Optional[str] = None; is_premium: Optional[bool] = None
    service_tags: Optional[List[str]] = None; price_level: Optional[int] = None
    total_spots: Optional[int] = None
    is_free_parking: Optional[bool] = None

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_id: str; author_name: str; stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    author_name: str; stars: int = Field(ge=1, le=5); comment: Optional[str] = None

class Offer(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_id: str; title: str; description: str
    discount_percent: Optional[int] = None; expires_at: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OfferCreate(BaseModel):
    location_id: str; title: str; description: str
    discount_percent: Optional[int] = None; expires_at: Optional[str] = None

class Event(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str; description: str; location_name: str
    date: str; time: Optional[str] = None
    location_id: Optional[str] = None
    image: Optional[str] = None
    images: list = []
    content_html: str = ""
    short_description: str = ""
    ticket_price: str = ""
    organizer: str = ""
    website: str = ""
    ticket_url: str = ""
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str; description: str; location_name: str
    date: str; time: Optional[str] = None
    location_id: Optional[str] = None
    image: Optional[str] = None
    images: list = []
    content_html: str = ""
    short_description: str = ""
    ticket_price: str = ""
    organizer: str = ""
    website: str = ""
    ticket_url: str = ""

class MenuItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_id: str; name: str; price: float
    description: Optional[str] = None; category: str = "Ostalo"
    image: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MenuItemCreate(BaseModel):
    name: str; price: float; description: Optional[str] = None
    category: str = "Ostalo"; image: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str; icon: str = "location"; color: str = "#888888"
class CategoryUpdate(BaseModel):
    name: Optional[str] = None; icon: Optional[str] = None; color: Optional[str] = None
class LoginRequest(BaseModel):
    email: str; password: str
class BusinessCreate(BaseModel):
    email: str; password: str; name: str; location_id: str

class PushTokenRegister(BaseModel):
    token: str; platform: str = "unknown"
    categories: List[str] = []   # e.g. ["news","events","offers"] or [] means "all"
    enabled: bool = True

class PushPreferencesUpdate(BaseModel):
    token: str
    categories: List[str] = []
    enabled: bool = True

class NotificationCreate(BaseModel):
    title: str = Field(min_length=1); body: str = Field(min_length=1)
    target_category: Optional[str] = None   # None=all, or "news","events","offers"
    smart_limit: bool = True                # Respect 2-per-day rate limit
class AppSettingsUpdate(BaseModel):
    paypal_link: Optional[str] = None; contact_email: Optional[str] = None

class EmergencyContact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    section: str; section_emoji: str = "📞"
    name: str; number: str; icon: str = "call"
    color: str = "#3B82F6"; bg: str = "#EFF6FF"
    note: Optional[str] = None; order: int = 0

class EmergencyContactCreate(BaseModel):
    section: str; section_emoji: str = "📞"
    name: str; number: str; icon: str = "call"
    color: str = "#3B82F6"; bg: str = "#EFF6FF"
    note: Optional[str] = None; order: int = 0

class EmergencyContactUpdate(BaseModel):
    section: Optional[str] = None; section_emoji: Optional[str] = None
    name: Optional[str] = None; number: Optional[str] = None
    icon: Optional[str] = None; color: Optional[str] = None
    bg: Optional[str] = None; note: Optional[str] = None; order: Optional[int] = None

class NewsArticle(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str; content: str; category: str = "Vijesti"
    image: Optional[str] = None
    images: list = []
    short_description: str = ""
    author: str = ""
    is_published: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class NewsCreate(BaseModel):
    title: str; content: str; category: str = "Vijesti"
    image: Optional[str] = None
    images: list = []
    short_description: str = ""
    author: str = ""
    is_published: bool = True

class NewsUpdate(BaseModel):
    title: Optional[str] = None; content: Optional[str] = None
    category: Optional[str] = None; image: Optional[str] = None
    images: Optional[list] = None
    short_description: Optional[str] = None
    author: Optional[str] = None
    is_published: Optional[bool] = None

# ===== Reservation Models =====
class ReservationCreate(BaseModel):
    location_id: str
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    reservation_type: str = "table"  # "table" | "room"
    # Restaurant/Cafe fields
    date: Optional[str] = None       # YYYY-MM-DD
    time: Optional[str] = None       # HH:MM
    table_preference: Optional[str] = None  # "unutra" | "vani" | "svejedno"
    # Hotel fields
    check_in_date: Optional[str] = None   # YYYY-MM-DD
    check_out_date: Optional[str] = None  # YYYY-MM-DD
    room_type: Optional[str] = None       # "soba" | "apartman" | "studio"
    bed_type: Optional[str] = None        # "jedan_krevet" | "dva_kreveta" | "bracni_krevet"
    # Common
    guests: int = Field(default=2, ge=1, le=20)
    special_requests: Optional[str] = None

class ReservationVerify(BaseModel):
    reservation_id: str
    code: str

class ReservationStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

DEFAULT_EMERGENCY_CONTACTS = [
    {"section": "Hitni Servisi", "section_emoji": "🚨", "name": "Opći hitni broj", "number": "112", "icon": "alert-circle", "color": "#fff", "bg": "#EF4444", "note": "EU standard — uvijek dostupan", "order": 0},
    {"section": "Hitni Servisi", "section_emoji": "🚨", "name": "Policija", "number": "122", "icon": "shield-checkmark", "color": "#EF4444", "bg": "#FEE2E2", "order": 1},
    {"section": "Hitni Servisi", "section_emoji": "🚨", "name": "Vatrogasci", "number": "123", "icon": "flame", "color": "#F97316", "bg": "#FFF7ED", "order": 2},
    {"section": "Hitni Servisi", "section_emoji": "🚨", "name": "Hitna pomoć", "number": "124", "icon": "medkit", "color": "#10B981", "bg": "#ECFDF5", "order": 3},
    {"section": "Zdravstvo – Gradačac", "section_emoji": "🏥", "name": "Dom zdravlja Gradačac", "number": "035 367 000", "icon": "medical", "color": "#10B981", "bg": "#ECFDF5", "note": "Josipa Šibera bb", "order": 0},
    {"section": "Zdravstvo – Gradačac", "section_emoji": "🏥", "name": "Apoteka Adonis (non-stop)", "number": "035 369 874", "icon": "flask", "color": "#3B82F6", "bg": "#EFF6FF", "note": "0-24h, Josipa Šibera bb", "order": 1},
    {"section": "Zdravstvo – Gradačac", "section_emoji": "🏥", "name": "Apoteka Ibn Sina (non-stop)", "number": "035 816 056", "icon": "moon", "color": "#7C3AED", "bg": "#EDE9FE", "note": "0-24h, Josipa Šibera 3", "order": 2},
    {"section": "Gradska uprava", "section_emoji": "🏛️", "name": "Grad Gradačac – centrala", "number": "035 369 751", "icon": "business", "color": "#7C3AED", "bg": "#EDE9FE", "note": "H. K. Gradaščevića 4", "order": 0},
    {"section": "Gradska uprava", "section_emoji": "🏛️", "name": "JP Komunalac – centrala", "number": "035 817 219", "icon": "construct", "color": "#F59E0B", "bg": "#FFFBEB", "note": "H. K. Gradaščevića 114", "order": 1},
    {"section": "Gradska uprava", "section_emoji": "🏛️", "name": "JP Komunalac – dispečer", "number": "035 817 266", "icon": "water", "color": "#3B82F6", "bg": "#EFF6FF", "note": "Kvarovi, vodovod, odvoz", "order": 2},
    {"section": "Ostale Usluge", "section_emoji": "📞", "name": "BIHAMK – cestovna pomoć", "number": "1282", "icon": "car", "color": "#F97316", "bg": "#FFF7ED", "note": "Pomoć na cesti", "order": 0},
    {"section": "Ostale Usluge", "section_emoji": "📞", "name": "Struja – kvar (ED BiH)", "number": "0800 20 405", "icon": "flash", "color": "#F59E0B", "bg": "#FFFBEB", "note": "Besplatan poziv", "order": 1},
    {"section": "Ostale Usluge", "section_emoji": "📞", "name": "Taksi Gradačac", "number": "061 663 910", "icon": "car-sport", "color": "#10B981", "bg": "#ECFDF5", "order": 2},
]

DEFAULT_NEWS = [
    {"title": "Gradačac Mapa – dobrodošlica!", "content": "Sa ponosom vam predstavljamo mobilnu aplikaciju Gradačac Mapa – vaš digitalni vodič kroz grad. Pronađite restorane, kafiće, markete, apoteke i sve gradske servise na jednom mjestu. Aplikacija je besplatna i stalno se unapređuje.", "category": "Obavještenje"},
    {"title": "Gradačačka tvrđava – otvorena za posjetioce", "content": "Gradačačka tvrđava, simbol i ponos grada, otvorena je za posjetioce svaki dan. Tvrđava iz 15. vijeka nudi predivan pogled na grad i okolinu. Ulaz je besplatan. Preporučujemo posjet u večernjim satima.", "category": "Turizam"},
    {"title": "Festival kulture 'Dani Husejn-kapetana'", "content": "Ovog ljeta Gradačac će biti domaćin tradicionalnog festivala koji slavi kulturno naslijeđe grada. Očekuju se koncerti, izložbe i prezentacije tradicije. Pratite aplikaciju za ažurirane informacije.", "category": "Kultura"},
    {"title": "Novi parking u centru – besplatan!", "content": "Otvorena je nova parking zona u blizini gradskog trga sa 45 mjesta. Parking je besplatan prvih 2 sata, a lokacija je dostupna u aplikaciji pod kategorijom Parkinzi.", "category": "Vijesti"},
]

DEFAULT_CATEGORIES = [
    {"id": "restaurant", "name": "Restorani", "icon": "restaurant", "color": "#FF6B6B"},
    {"id": "market", "name": "Marketi", "icon": "cart", "color": "#4ECDC4"},
    {"id": "auto_service", "name": "Auto Servisi", "icon": "car", "color": "#45B7D1"},
    {"id": "cafe", "name": "Kafići", "icon": "cafe", "color": "#96CEB4"},
    {"id": "pharmacy", "name": "Ljekarne", "icon": "medkit", "color": "#FFEAA7"},
    {"id": "gas_station", "name": "Benzinske", "icon": "water", "color": "#DDA0DD"},
    {"id": "parking", "name": "Parkinzi", "icon": "car-sport", "color": "#4A90D9"},
    {"id": "prenociste", "name": "Prenoćišta", "icon": "bed", "color": "#9B59B6"},
]

SAMPLE_PARKINGS = [
    {"name": "Gradski Parking Centar", "category": "parking", "address": "Centar, Gradačac",
     "latitude": 44.8792, "longitude": 18.4262, "description": "Centralni gradski parking u srcu grada, blizu tvrđave i džamije.",
     "working_hours": "00:00 - 24:00", "total_spots": 80, "is_free_parking": True,
     "service_tags": ["Besplatan", "24h", "Centar"], "price_level": 0},
    {"name": "Parking Tvrđava", "category": "parking", "address": "Kod Gradačačke tvrđave",
     "latitude": 44.8808, "longitude": 18.4256, "description": "Parking uz Gradačačku tvrđavu, idealan za turiste i posjetioce.",
     "working_hours": "07:00 - 22:00", "total_spots": 40, "is_free_parking": True,
     "service_tags": ["Besplatan", "Tvrđava", "Turisti"], "price_level": 0},
    {"name": "Parking Pijaca", "category": "parking", "address": "Pored pijace, Gradačac",
     "latitude": 44.8780, "longitude": 18.4285, "description": "Parking uz gradsku pijacu, plaćen tokom radnog vremena pijace.",
     "working_hours": "06:00 - 17:00", "total_spots": 60, "is_free_parking": False,
     "service_tags": ["Plaćen", "Pijaca", "Dnevni"], "price_level": 1},
    {"name": "Parking Sportski Centar", "category": "parking", "address": "Sportski centar Gradačac",
     "latitude": 44.8764, "longitude": 18.4240, "description": "Veliki parking uz sportski centar. Besplatan tokom dana.",
     "working_hours": "00:00 - 24:00", "total_spots": 120, "is_free_parking": True,
     "service_tags": ["Besplatan", "Veliki", "Sport"], "price_level": 0},
]

SAMPLE_PRENOCISTA = [
    {"name": "Hotel Gradačac", "category": "prenociste", "address": "Husein-kapetana Gradaščevića 12, Gradačac",
     "latitude": 44.8799, "longitude": 18.4271, "phone": "+387 35 817 800",
     "description": "Centralni hotel u srcu Gradačca. Savremeno opremljene sobe, restoran i besplatan WiFi.",
     "working_hours": "00:00 - 24:00", "service_tags": ["WiFi", "Restoran", "Parking"], "price_level": 2},
    {"name": "Motel Bosna", "category": "prenociste", "address": "Magistralni put M-14, Gradačac",
     "latitude": 44.8730, "longitude": 18.4400, "phone": "+387 35 820 500",
     "description": "Pristojan motel uz magistralni put. Parking za vozila i kamione.",
     "working_hours": "00:00 - 24:00", "service_tags": ["WiFi", "Parking", "Magistrala"], "price_level": 1},
    {"name": "Pansion Stari Grad", "category": "prenociste", "address": "Alije Izetbegovića 8, Gradačac",
     "latitude": 44.8796, "longitude": 18.4258, "phone": "+387 35 816 900",
     "description": "Porodični pansion blizu historijskog centra. Domaći doručak uključen.",
     "working_hours": "00:00 - 24:00", "service_tags": ["Doručak", "Porodično", "Historija"], "price_level": 1},
]

SAMPLE_LOCATIONS = [
    {"name": "Restoran Stari Grad", "category": "restaurant", "address": "Husein-kapetana Gradaščevića bb", "latitude": 44.8797, "longitude": 18.4275, "phone": "+387 35 817 000", "description": "Tradicionalna bosanska kuhinja sa autentičnim receptima.", "working_hours": "08:00 - 23:00", "service_tags": ["Bosanska kuhinja", "Ćevapi"], "price_level": 2},
    {"name": "Restoran Zmaj", "category": "restaurant", "address": "Zmaja od Bosne 12", "latitude": 44.8785, "longitude": 18.4290, "phone": "+387 35 818 111", "description": "Roštilj i domaća jela.", "working_hours": "10:00 - 23:00", "service_tags": ["Roštilj", "Domaća hrana"], "price_level": 2},
    {"name": "Ćevabdžinica Kod Mehmeda", "category": "restaurant", "address": "Trg Husein-kapetana 5", "latitude": 44.8802, "longitude": 18.4268, "phone": "+387 35 817 222", "description": "Najbolji ćevapi u gradu.", "working_hours": "08:00 - 22:00", "service_tags": ["Ćevapi", "Fast food"], "price_level": 1},
    {"name": "Bingo", "category": "market", "address": "Željeznička bb", "latitude": 44.8770, "longitude": 18.4310, "phone": "+387 35 816 000", "description": "Najveći supermarket u gradu.", "working_hours": "07:00 - 22:00", "service_tags": ["Supermarket", "Svježe voće"], "price_level": 2},
    {"name": "Konzum", "category": "market", "address": "Titova 45", "latitude": 44.8792, "longitude": 18.4255, "phone": "+387 35 815 500", "description": "Prodavnica mješovite robe.", "working_hours": "07:00 - 21:00", "service_tags": ["Mješovita roba"], "price_level": 1},
    {"name": "Robot", "category": "market", "address": "Alije Izetbegovića 18", "latitude": 44.8812, "longitude": 18.4240, "phone": "+387 35 814 333", "description": "Mali market u centru grada.", "working_hours": "06:00 - 22:00", "service_tags": ["Mini market"], "price_level": 1},
    {"name": "Auto Servis Čamdžić", "category": "auto_service", "address": "Industrijska zona bb", "latitude": 44.8750, "longitude": 18.4350, "phone": "+387 35 820 100", "description": "Opravka svih vrsta vozila.", "working_hours": "08:00 - 17:00", "service_tags": ["Mehanika", "Dijagnostika"], "price_level": 2},
    {"name": "Vulkanizer Mehić", "category": "auto_service", "address": "Magistralni put bb", "latitude": 44.8730, "longitude": 18.4380, "phone": "+387 35 821 200", "description": "Gume i vulkanizacija.", "working_hours": "07:00 - 19:00", "service_tags": ["Vulkanizacija", "Gume"], "price_level": 1},
    {"name": "Caffe Bar Central", "category": "cafe", "address": "Trg Husein-kapetana 1", "latitude": 44.8800, "longitude": 18.4270, "phone": "+387 35 817 444", "description": "Kafa i kolači u srcu grada.", "working_hours": "07:00 - 24:00", "service_tags": ["Espresso", "Kolači"], "price_level": 2},
    {"name": "Caffé di Milano", "category": "cafe", "address": "H.K. Gradaščevića 25", "latitude": 44.8795, "longitude": 18.4282, "phone": "+387 35 818 555", "description": "Moderni espresso bar.", "working_hours": "08:00 - 23:00", "service_tags": ["Espresso", "WiFi"], "price_level": 2},
    {"name": "Apoteka Gradačac", "category": "pharmacy", "address": "Titova 10", "latitude": 44.8798, "longitude": 18.4265, "phone": "+387 35 815 111", "description": "Glavna gradska apoteka.", "working_hours": "07:00 - 20:00", "service_tags": ["Lijekovi", "Kozmetika"], "price_level": 2},
    {"name": "NIS Petrol", "category": "gas_station", "address": "Magistralni put bb", "latitude": 44.8720, "longitude": 18.4400, "phone": "+387 35 825 000", "description": "Benzinska pumpa 24h.", "working_hours": "00:00 - 24:00", "service_tags": ["Benzin", "Dizel", "24h"], "price_level": 2},
    {"name": "Hifa Petrol", "category": "gas_station", "address": "Ulaz u grad bb", "latitude": 44.8850, "longitude": 18.4150, "phone": "+387 35 826 000", "description": "Benzinska i auto gas.", "working_hours": "06:00 - 22:00", "service_tags": ["Benzin", "Auto gas"], "price_level": 2},
]

# ===== Startup =====
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.reviews.create_index("location_id")
    await db.offers.create_index("location_id")
    await db.events.create_index("date")
    await db.menu_items.create_index("location_id")
    await db.analytics.create_index([("location_id", 1), ("date", 1)])
    # Seed categories
    if await db.categories.count_documents({}) == 0:
        for cat in DEFAULT_CATEGORIES: await db.categories.insert_one(dict(cat))
    # Seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({"email": ADMIN_EMAIL, "password_hash": hash_pw(ADMIN_PASSWORD), "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
    elif not verify_pw(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_pw(ADMIN_PASSWORD)}})
    # Seed locations
    if await db.locations.count_documents({}) == 0:
        for loc in SAMPLE_LOCATIONS:
            await db.locations.insert_one(Location(**loc).dict())
    # Seed parking & prenociste categories (idempotent)
    for cat in DEFAULT_CATEGORIES:
        if not await db.categories.find_one({"id": cat["id"]}):
            await db.categories.insert_one(dict(cat))
    # Seed parking locations
    if await db.locations.count_documents({"category": "parking"}) == 0:
        for loc in SAMPLE_PARKINGS:
            await db.locations.insert_one(Location(**loc).dict())
    # Seed prenociste locations
    if await db.locations.count_documents({"category": "prenociste"}) == 0:
        for loc in SAMPLE_PRENOCISTA:
            await db.locations.insert_one(Location(**loc).dict())
    # Seed emergency contacts
    if await db.emergency_contacts.count_documents({}) == 0:
        for ec in DEFAULT_EMERGENCY_CONTACTS:
            ec_obj = {"id": str(uuid.uuid4()), **ec}
            await db.emergency_contacts.insert_one(ec_obj)
    # Seed news
    if await db.news.count_documents({}) == 0:
        for n in DEFAULT_NEWS:
            n_obj = NewsArticle(**n).dict()
            await db.news.insert_one(n_obj)

async def recalc_rating(lid: str):
    r = await db.reviews.aggregate([{"$match": {"location_id": lid}}, {"$group": {"_id": None, "avg": {"$avg": "$stars"}, "cnt": {"$sum": 1}}}]).to_list(1)
    if r: await db.locations.update_one({"id": lid}, {"$set": {"avg_rating": round(r[0]["avg"], 1), "review_count": r[0]["cnt"]}})
    else: await db.locations.update_one({"id": lid}, {"$set": {"avg_rating": 0, "review_count": 0}})

async def track_analytics(lid: str, action: str):
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    await db.analytics.update_one({"location_id": lid, "date": today}, {"$inc": {action: 1}}, upsert=True)
    await db.locations.update_one({"id": lid}, {"$inc": {action: 1}})

def is_open(working_hours: str) -> bool:
    if not working_hours: return False
    try:
        parts = working_hours.replace(" ", "").split("-")
        now = datetime.now(timezone(timedelta(hours=1)))  # CET
        h, m = now.hour, now.minute
        oh, om = int(parts[0].split(":")[0]), int(parts[0].split(":")[1])
        ch, cm = int(parts[1].split(":")[0]), int(parts[1].split(":")[1])
        current = h * 60 + m
        opens = oh * 60 + om
        closes = ch * 60 + cm
        if closes == 0 and opens == 0: return True  # 00:00-24:00
        if closes <= opens: return current >= opens or current < closes  # overnight
        return opens <= current < closes
    except: return False

def calc_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    p = math.pi / 180
    a = 0.5 - math.cos((lat2-lat1)*p)/2 + math.cos(lat1*p)*math.cos(lat2*p)*(1-math.cos((lon2-lon1)*p))/2
    return R * 2 * math.asin(math.sqrt(a))

# ===== Auth =====
@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_pw(req.password, user["password_hash"]): raise HTTPException(401, "Pogrešan email ili lozinka")
    token = make_token(str(user["_id"]), user["email"], user.get("role", "user"))
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name",""), "role": user.get("role","user"), "token": token, "location_id": user.get("location_id", "")}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_user)):
    return user

# ===== Public =====
@api_router.get("/")
async def root():
    return {"message": "Gradačac City Map API", "version": "3.0"}

@api_router.get("/categories")
async def get_categories():
    return await db.categories.find({}, {"_id": 0}).to_list(100)

@api_router.get("/locations")
async def get_locations(category: Optional[str] = Query(None), lat: Optional[float] = Query(None), lng: Optional[float] = Query(None), sort: Optional[str] = Query(None)):
    q = {}
    if category: q["category"] = category
    locs = await db.locations.find(q, {"_id": 0}).to_list(1000)
    # Add is_open status
    for loc in locs:
        loc["is_open"] = is_open(loc.get("working_hours", ""))
    # Sort by distance if coords provided
    if lat and lng and sort == "distance":
        for loc in locs:
            loc["distance"] = round(calc_distance(lat, lng, loc["latitude"], loc["longitude"]))
        locs.sort(key=lambda x: x["distance"])
    return locs

@api_router.get("/locations/{lid}")
async def get_location(lid: str):
    loc = await db.locations.find_one({"id": lid}, {"_id": 0})
    if not loc: raise HTTPException(404, "Not found")
    loc["is_open"] = is_open(loc.get("working_hours", ""))
    await track_analytics(lid, "views")
    return loc

@api_router.post("/locations/{lid}/track/{action}")
async def track_action(lid: str, action: str):
    if action not in ("nav_clicks", "call_clicks"): raise HTTPException(400, "Invalid action")
    await track_analytics(lid, action)
    return {"ok": True}

@api_router.get("/search")
async def search_locations(q: str = Query(..., min_length=2)):
    safe_q = re.escape(q)
    locs = await db.locations.find({"$or": [{"name": {"$regex": safe_q, "$options": "i"}}, {"address": {"$regex": safe_q, "$options": "i"}}]}, {"_id": 0}).to_list(100)
    for loc in locs: loc["is_open"] = is_open(loc.get("working_hours", ""))
    return locs

# ===== Reviews =====
@api_router.get("/locations/{lid}/reviews")
async def get_reviews(lid: str):
    return await db.reviews.find({"location_id": lid}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.post("/locations/{lid}/reviews")
async def create_review(lid: str, inp: ReviewCreate):
    if not await db.locations.find_one({"id": lid}): raise HTTPException(404, "Not found")
    r = Review(location_id=lid, **inp.dict())
    to_ins = dict(r.dict())
    await db.reviews.insert_one(to_ins)
    await recalc_rating(lid)
    return r.dict()

# ===== Offers (Public read) =====
@api_router.get("/offers")
async def get_all_offers(active_only: bool = Query(True)):
    q = {"is_active": True} if active_only else {}
    offers = await db.offers.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)
    # Batch fetch locations (avoid N+1)
    loc_ids = list({o["location_id"] for o in offers if o.get("location_id")})
    loc_map = {}
    if loc_ids:
        locs = await db.locations.find({"id": {"$in": loc_ids}}, {"_id": 0, "id": 1, "name": 1, "images": 1}).to_list(None)
        loc_map = {l["id"]: l for l in locs}
    for o in offers:
        loc = loc_map.get(o.get("location_id"))
        if loc:
            o["location_name"] = loc.get("name", "")
            o["location_image"] = loc.get("images", [""])[0] if loc.get("images") else ""
    return offers

@api_router.get("/locations/{lid}/offers")
async def get_location_offers(lid: str):
    return await db.offers.find({"location_id": lid, "is_active": True}, {"_id": 0}).to_list(50)

# ===== Nearby Offers =====
@api_router.get("/offers/nearby")
async def get_nearby_offers(lat: float = Query(...), lng: float = Query(...), radius: int = Query(500)):
    """Get active offers from locations within radius (meters)"""
    offers = await db.offers.find({"is_active": True}, {"_id": 0}).to_list(100)
    # Batch fetch locations (avoid N+1)
    loc_ids = list({o["location_id"] for o in offers if o.get("location_id")})
    loc_map = {}
    if loc_ids:
        locs = await db.locations.find({"id": {"$in": loc_ids}}, {"_id": 0}).to_list(None)
        loc_map = {l["id"]: l for l in locs}
    nearby = []
    for o in offers:
        loc = loc_map.get(o.get("location_id"))
        if loc:
            dist = calc_distance(lat, lng, loc["latitude"], loc["longitude"])
            if dist <= radius:
                o["location_name"] = loc.get("name", "")
                o["location_image"] = loc.get("images", [""])[0] if loc.get("images") else ""
                o["distance"] = round(dist)
                nearby.append(o)
    nearby.sort(key=lambda x: x.get("distance", 0))
    return nearby

# ===== QR / Coupon Activation =====
class CouponActivation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    offer_id: str
    location_id: str
    user_name: str
    activated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    redeemed: bool = False
    redeemed_at: Optional[datetime] = None

class ActivateCouponRequest(BaseModel):
    user_name: str

@api_router.post("/offers/{offer_id}/activate")
async def activate_coupon(offer_id: str, inp: ActivateCouponRequest):
    """User scans QR and activates coupon"""
    offer = await db.offers.find_one({"id": offer_id, "is_active": True}, {"_id": 0})
    if not offer: raise HTTPException(404, "Ponuda nije pronađena ili je istekla")
    activation = CouponActivation(offer_id=offer_id, location_id=offer["location_id"], user_name=inp.user_name)
    to_ins = dict(activation.dict())
    await db.coupon_activations.insert_one(to_ins)
    return {"activation_id": activation.id, "offer_title": offer["title"], "discount_percent": offer.get("discount_percent"), "message": "Kupon aktiviran! Pokažite ovo osoblju."}

@api_router.get("/offers/{offer_id}/activations")
async def get_offer_activations(offer_id: str, user: dict = Depends(require_business_or_admin)):
    """Business sees who activated their coupons"""
    return await db.coupon_activations.find({"offer_id": offer_id}, {"_id": 0}).sort("activated_at", -1).to_list(100)

@api_router.put("/coupon-activations/{activation_id}/redeem")
async def redeem_coupon(activation_id: str, user: dict = Depends(require_business_or_admin)):
    """Business marks coupon as redeemed"""
    r = await db.coupon_activations.update_one({"id": activation_id}, {"$set": {"redeemed": True, "redeemed_at": datetime.now(timezone.utc)}})
    if r.matched_count == 0: raise HTTPException(404, "Aktivacija nije pronađena")
    return {"message": "Kupon iskorišten"}

@api_router.get("/locations/{lid}/qr-data")
async def get_qr_data(lid: str):
    """Get QR code data for a location"""
    loc = await db.locations.find_one({"id": lid}, {"_id": 0})
    if not loc: raise HTTPException(404)
    offers = await db.offers.find({"location_id": lid, "is_active": True}, {"_id": 0}).to_list(10)
    return {"location_id": lid, "location_name": loc["name"], "offers": [{"id": o["id"], "title": o["title"], "discount_percent": o.get("discount_percent")} for o in offers]}

# ===== Events (Public read) =====
@api_router.get("/events")
async def get_events():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return await db.events.find({"date": {"$gte": today}}, {"_id": 0}).sort("date", 1).to_list(50)

@api_router.get("/events/{eid}")
async def get_event(eid: str):
    ev = await db.events.find_one({"id": eid}, {"_id": 0})
    if not ev: raise HTTPException(404, "Event not found")
    return ev

@api_router.get("/notifications-feed")
async def get_notifications_feed(limit: int = Query(30)):
    """Unified notifications feed: news + events + active offers, sorted by date."""
    items = []
    # News (latest 8)
    news = await db.news.find({}, {"_id": 0}).sort("created_at", -1).to_list(8)
    for n in news:
        items.append({
            "id": n["id"], "type": "news",
            "title": n["title"],
            "body": (n.get("content") or "")[:120],
            "category": n.get("category", "Vijesti"),
            "created_at": n.get("created_at", ""),
            "icon": "newspaper-outline", "color": "#3B82F6",
        })
    # Upcoming events (next 8)
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    events = await db.events.find({"date": {"$gte": today}}, {"_id": 0}).sort("date", 1).to_list(8)
    for e in events:
        loc_label = e.get("location_name") or e.get("location") or "Gradačac"
        items.append({
            "id": e["id"], "type": "event",
            "title": e["title"],
            "body": f"{e.get('date', '')} · {loc_label}",
            "category": "Događaj",
            "created_at": e.get("created_at", e.get("date", "")),
            "icon": "calendar-outline", "color": "#7C3AED",
        })
    # Active offers (latest 8)
    offers = await db.offers.find({"is_active": True}, {"_id": 0}).sort("created_at", -1).to_list(8)
    if offers:
        loc_ids = list({o["location_id"] for o in offers if o.get("location_id")})
        locs = await db.locations.find({"id": {"$in": loc_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
        loc_map = {l["id"]: l["name"] for l in locs}
        for o in offers:
            loc_name = loc_map.get(o.get("location_id", ""), "Lokacija")
            items.append({
                "id": o["id"], "type": "offer",
                "title": o["title"],
                "body": f"{loc_name} · -{o.get('discount_percent', 0)}% popust",
                "category": "Ponuda",
                "created_at": o.get("created_at", ""),
                "icon": "pricetag-outline", "color": "#F59E0B",
                "location_id": o.get("location_id", ""),
            })
    items.sort(key=lambda x: str(x.get("created_at", "")), reverse=True)
    return items[:limit]

# ===== Menu (Public read) =====
@api_router.get("/locations/{lid}/menu")
async def get_menu(lid: str):
    return await db.menu_items.find({"location_id": lid}, {"_id": 0}).to_list(200)

# ===== Business Routes =====
@api_router.put("/business/profile")
async def update_business_profile(inp: LocationUpdate, user: dict = Depends(require_business_or_admin)):
    lid = user.get("location_id")
    if not lid: raise HTTPException(400, "No location linked")
    update = {k: v for k, v in inp.dict().items() if v is not None}
    if "category" in update: del update["category"]  # can't change category
    if update: await db.locations.update_one({"id": lid}, {"$set": update})
    return await db.locations.find_one({"id": lid}, {"_id": 0})

@api_router.post("/business/offers")
async def create_business_offer(inp: OfferCreate, user: dict = Depends(require_business_or_admin)):
    if user["role"] == "business" and inp.location_id != user.get("location_id"): raise HTTPException(403, "Can only create offers for your location")
    o = Offer(**inp.dict())
    to_ins = dict(o.dict())
    await db.offers.insert_one(to_ins)
    return o.dict()

@api_router.delete("/business/offers/{oid}")
async def delete_business_offer(oid: str, user: dict = Depends(require_business_or_admin)):
    offer = await db.offers.find_one({"id": oid})
    if not offer: raise HTTPException(404, "Not found")
    if user["role"] == "business" and offer["location_id"] != user.get("location_id"): raise HTTPException(403, "Not your offer")
    await db.offers.delete_one({"id": oid})
    return {"message": "Deleted"}

@api_router.post("/business/menu")
async def create_menu_item(lid: str = Query(...), inp: MenuItemCreate = ..., user: dict = Depends(require_business_or_admin)):
    if user["role"] == "business" and lid != user.get("location_id"): raise HTTPException(403, "Not your location")
    item = MenuItem(location_id=lid, **inp.dict())
    to_ins = dict(item.dict())
    await db.menu_items.insert_one(to_ins)
    return item.dict()

@api_router.delete("/business/menu/{mid}")
async def delete_menu_item(mid: str, user: dict = Depends(require_business_or_admin)):
    await db.menu_items.delete_one({"id": mid})
    return {"message": "Deleted"}

@api_router.delete("/business/menu/all")
async def delete_all_menu_items(user: dict = Depends(require_business_or_admin)):
    lid = user.get("location_id")
    if not lid and user["role"] == "business":
        raise HTTPException(400, "Vaš nalog nije vezan za lokaciju")
    result = await db.menu_items.delete_many({"location_id": lid})
    return {"deleted": result.deleted_count}

@api_router.post("/business/menu/import")
async def import_menu_items(file: UploadFile = File(...), user: dict = Depends(require_business_or_admin)):
    """CSV import: naziv/name, cijena/price, kategorija/category, opis/description"""
    lid = user.get("location_id")
    if not lid and user["role"] == "business":
        raise HTTPException(400, "Vaš nalog nije vezan za lokaciju")
    # Admin must provide location via query param — for business, use their location
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    success, failed, errors = 0, 0, []
    to_insert = []

    for i, row in enumerate(rows, start=2):
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        try:
            name = row.get("naziv") or row.get("name", "")
            if not name:
                raise ValueError("Naziv je obavezan")
            price_str = row.get("cijena") or row.get("price", "")
            if not price_str:
                raise ValueError("Cijena je obavezna")
            price = float(price_str.replace(",", "."))
            category = row.get("kategorija") or row.get("category") or "Ostalo"
            description = row.get("opis") or row.get("description") or None
            item = MenuItem(location_id=lid, name=name, price=price, category=category, description=description)
            to_insert.append(item.dict())
            success += 1
        except Exception as e:
            failed += 1
            errors.append({"row": i, "name": row.get("naziv") or row.get("name", ""), "error": str(e)})

    if to_insert:
        await db.menu_items.insert_many(to_insert)

    return {"total": len(rows), "success": success, "failed": failed, "errors": errors[:20]}

@api_router.get("/business/stats")
async def get_business_stats(user: dict = Depends(require_business_or_admin)):
    lid = user.get("location_id")
    if not lid and user["role"] == "business": raise HTTPException(400, "No location")
    if user["role"] == "admin": lid = None  # admin sees all
    q = {"location_id": lid} if lid else {}
    stats = await db.analytics.find(q, {"_id": 0}).sort("date", -1).to_list(30)
    loc = await db.locations.find_one({"id": lid}, {"_id": 0}) if lid else None
    return {"daily": stats, "totals": {"views": loc.get("views", 0) if loc else 0, "nav_clicks": loc.get("nav_clicks", 0) if loc else 0, "call_clicks": loc.get("call_clicks", 0) if loc else 0} if loc else {}}

# ===== Admin =====
@api_router.post("/admin/locations")
async def admin_create_loc(inp: LocationCreate, user: dict = Depends(require_admin)):
    loc = Location(**inp.dict())
    await db.locations.insert_one(loc.dict())
    return loc.dict()

@api_router.put("/admin/locations/{lid}")
async def admin_update_loc(lid: str, inp: LocationUpdate, user: dict = Depends(require_admin)):
    u = {k: v for k, v in inp.dict().items() if v is not None}
    if not u: raise HTTPException(400, "No data")
    r = await db.locations.update_one({"id": lid}, {"$set": u})
    if r.matched_count == 0: raise HTTPException(404, "Not found")
    return await db.locations.find_one({"id": lid}, {"_id": 0})

@api_router.delete("/admin/locations/{lid}")
async def admin_delete_loc(lid: str, user: dict = Depends(require_admin)):
    r = await db.locations.delete_one({"id": lid})
    if r.deleted_count == 0: raise HTTPException(404, "Not found")
    await db.reviews.delete_many({"location_id": lid})
    await db.offers.delete_many({"location_id": lid})
    await db.menu_items.delete_many({"location_id": lid})
    return {"message": "Deleted"}

@api_router.post("/admin/locations/bulk-import")
async def bulk_import_locations(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    """CSV import: name,category,address,latitude,longitude,phone,description,working_hours,is_premium,service_tags,price_level"""
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")  # handle BOM
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    # Fetch categories for name matching
    cats = await db.categories.find({}, {"_id": 0, "id": 1, "name": 1}).to_list(None)
    cat_by_name = {c["name"].lower(): c["id"] for c in cats}
    cat_by_id = {c["id"]: c["id"] for c in cats}

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    success, failed, errors = 0, 0, []
    to_insert = []

    for i, row in enumerate(rows, start=2):  # row 1 = header
        row = {k.strip().lower(): v.strip() for k, v in row.items() if k}
        try:
            name = row.get("name") or row.get("naziv", "")
            if not name: raise ValueError("Naziv je obavezan")

            cat_raw = row.get("category") or row.get("kategorija", "")
            category = cat_by_id.get(cat_raw) or cat_by_name.get(cat_raw.lower())
            if not category: raise ValueError(f"Kategorija '{cat_raw}' nije pronađena")

            address = row.get("address") or row.get("adresa", "")
            if not address: raise ValueError("Adresa je obavezna")

            lat_str = row.get("latitude") or row.get("latitude") or "44.8797"
            lon_str = row.get("longitude") or row.get("longitude") or "18.4275"
            latitude = float(lat_str.replace(",", "."))
            longitude = float(lon_str.replace(",", "."))

            is_premium_str = (row.get("is_premium") or row.get("premium", "false")).lower()
            is_premium = is_premium_str in ("true", "1", "da", "yes")

            tags_raw = row.get("service_tags") or row.get("tagovi", "")
            service_tags = [t.strip() for t in re.split(r"[;|]", tags_raw) if t.strip()]

            price_level = int(row.get("price_level") or row.get("cijena", "0") or "0")

            loc = Location(
                name=name,
                category=category,
                address=address,
                latitude=latitude,
                longitude=longitude,
                phone=row.get("phone") or row.get("telefon") or None,
                description=row.get("description") or row.get("opis") or None,
                working_hours=row.get("working_hours") or row.get("radno_vrijeme") or None,
                is_premium=is_premium,
                service_tags=service_tags,
                price_level=price_level,
            )
            to_insert.append(loc.dict())
            success += 1
        except Exception as e:
            failed += 1
            errors.append({"row": i, "name": row.get("name") or row.get("naziv", ""), "error": str(e)})

    if to_insert:
        await db.locations.insert_many(to_insert)

    return {
        "total": len(rows),
        "success": success,
        "failed": failed,
        "errors": errors[:20]  # max 20 errors returned
    }

@api_router.post("/admin/upload-image")
async def admin_upload_image(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    """Generic image upload — saves to /uploads/ and returns a public URL."""
    allowed = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/jpg"}
    ct = (file.content_type or "").lower()
    if ct not in allowed:
        raise HTTPException(400, "Dozvoljene su samo slike (JPG, PNG, WebP, GIF)")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "Maksimalna veličina slike je 10 MB")
    ext = (file.filename or "img").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp", "gif"):
        ext = "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    (UPLOADS_DIR / filename).write_bytes(content)
    return {"url": f"/api/uploads/{filename}", "filename": filename}

@api_router.post("/admin/upload-apk")
async def admin_upload_apk(file: UploadFile = File(...), user: dict = Depends(require_admin)):
    """Upload APK file and save download link to site settings."""
    allowed_types = {"application/vnd.android.package-archive", "application/octet-stream", "application/zip"}
    ct = (file.content_type or "").lower()
    filename_lower = (file.filename or "").lower()
    if not filename_lower.endswith(".apk") and ct not in allowed_types:
        raise HTTPException(400, "Dozvoljen je samo APK fajl (.apk)")
    content = await file.read()
    if len(content) > 300 * 1024 * 1024:
        raise HTTPException(400, "Maksimalna veličina APK je 300 MB")
    safe_name = f"app-release-{uuid.uuid4().hex[:8]}.apk"
    (UPLOADS_DIR / safe_name).write_bytes(content)
    apk_url = f"/api/uploads/{safe_name}"
    apk_size_mb = round(len(content) / (1024 * 1024), 1)
    from datetime import timezone
    now_str = datetime.now(timezone.utc).strftime("%d.%m.%Y")
    # Spremi u site_settings
    for key, val in [("apk_url", apk_url), ("apk_filename", safe_name), ("apk_size", str(apk_size_mb)), ("apk_date", now_str)]:
        await db.site_settings.update_one({"key": key}, {"$set": {"key": key, "value": val}}, upsert=True)
    return {"url": apk_url, "filename": safe_name, "size_mb": apk_size_mb, "date": now_str}

@api_router.post("/admin/locations/{lid}/images")
async def upload_image(lid: str, file: UploadFile = File(...), user: dict = Depends(require_business_or_admin)):
    if user["role"] == "business" and lid != user.get("location_id"): raise HTTPException(403, "Not your location")
    loc = await db.locations.find_one({"id": lid})
    if not loc: raise HTTPException(404, "Not found")
    content = await file.read()
    if len(content) > 5*1024*1024: raise HTTPException(400, "Max 5MB")
    b64 = base64.b64encode(content).decode()
    uri = f"data:{file.content_type or 'image/jpeg'};base64,{b64}"
    await db.locations.update_one({"id": lid}, {"$push": {"images": uri}})
    return {"message": "OK", "image": uri}

@api_router.delete("/admin/locations/{lid}/images/{idx}")
async def delete_image(lid: str, idx: int, user: dict = Depends(require_business_or_admin)):
    loc = await db.locations.find_one({"id": lid}, {"_id": 0})
    if not loc: raise HTTPException(404)
    imgs = loc.get("images", [])
    if idx < 0 or idx >= len(imgs): raise HTTPException(400)
    imgs.pop(idx)
    await db.locations.update_one({"id": lid}, {"$set": {"images": imgs}})
    return {"message": "OK"}

@api_router.delete("/admin/reviews/{rid}")
async def admin_del_review(rid: str, user: dict = Depends(require_admin)):
    r = await db.reviews.find_one({"id": rid})
    if not r: raise HTTPException(404)
    await db.reviews.delete_one({"id": rid})
    await recalc_rating(r["location_id"])
    return {"message": "OK"}

@api_router.post("/admin/categories")
async def admin_create_cat(inp: CategoryCreate, user: dict = Depends(require_admin)):
    cat = {"id": str(uuid.uuid4()), "name": inp.name, "icon": inp.icon, "color": inp.color}
    await db.categories.insert_one(dict(cat))
    return cat

@api_router.put("/admin/categories/{cid}")
async def admin_update_cat(cid: str, inp: CategoryUpdate, user: dict = Depends(require_admin)):
    u = {k: v for k, v in inp.dict().items() if v is not None}
    if not u: raise HTTPException(400)
    r = await db.categories.update_one({"id": cid}, {"$set": u})
    if r.matched_count == 0: raise HTTPException(404)
    return await db.categories.find_one({"id": cid}, {"_id": 0})

@api_router.delete("/admin/categories/{cid}")
async def admin_del_cat(cid: str, user: dict = Depends(require_admin)):
    if await db.locations.count_documents({"category": cid}) > 0: raise HTTPException(400, "Kategorija u upotrebi")
    r = await db.categories.delete_one({"id": cid})
    if r.deleted_count == 0: raise HTTPException(404)
    return {"message": "OK"}

@api_router.post("/admin/business-accounts")
async def create_business_account(inp: BusinessCreate, user: dict = Depends(require_admin)):
    if await db.users.find_one({"email": inp.email.lower()}): raise HTTPException(400, "Email već postoji")
    loc = await db.locations.find_one({"id": inp.location_id})
    if not loc: raise HTTPException(404, "Lokacija ne postoji")
    await db.users.insert_one({"email": inp.email.lower(), "password_hash": hash_pw(inp.password), "name": inp.name, "role": "business", "location_id": inp.location_id, "created_at": datetime.now(timezone.utc)})
    return {"message": f"Biznis nalog kreiran za {inp.email}"}

@api_router.put("/admin/business-accounts/{uid}")
async def update_business_account(uid: str, inp: dict, user: dict = Depends(require_admin)):
    upd: dict = {}
    if "name" in inp: upd["name"] = inp["name"]
    if "email" in inp:
        existing = await db.users.find_one({"email": inp["email"].lower()})
        if existing and str(existing.get("_id", "")) != uid:
            raise HTTPException(400, "Email već postoji")
        upd["email"] = inp["email"].lower()
    if "location_id" in inp:
        loc = await db.locations.find_one({"id": inp["location_id"]})
        if not loc: raise HTTPException(404, "Lokacija ne postoji")
        upd["location_id"] = inp["location_id"]
    if inp.get("password"):
        upd["password_hash"] = hash_pw(inp["password"])
    if not upd: raise HTTPException(400, "Ništa za ažurirati")
    await db.users.update_one({"id": uid}, {"$set": upd})
    updated = await db.users.find_one({"id": uid})
    if not updated: raise HTTPException(404, "Nalog nije pronađen")
    updated.pop("_id", None); updated.pop("password_hash", None)
    return updated

@api_router.post("/admin/events")
async def admin_create_event(inp: EventCreate, user: dict = Depends(require_business_or_admin)):
    e = Event(created_by=user["id"], **inp.dict())
    to_ins = dict(e.dict())
    await db.events.insert_one(to_ins)
    return e.dict()

@api_router.put("/admin/events/{eid}")
async def admin_update_event(eid: str, inp: dict, user: dict = Depends(require_business_or_admin)):
    allowed = {
        "title", "description", "location_name", "date", "time", "location_id", "image",
        "images", "content_html", "short_description", "ticket_price", "organizer", "website", "ticket_url"
    }
    upd = {k: v for k, v in inp.items() if k in allowed}
    if not upd:
        raise HTTPException(400, "Nothing to update")
    await db.events.update_one({"id": eid}, {"$set": upd})
    updated = await db.events.find_one({"id": eid})
    if not updated:
        raise HTTPException(404, "Event not found")
    updated.pop("_id", None)
    return updated

@api_router.delete("/admin/events/{eid}")
async def admin_del_event(eid: str, user: dict = Depends(require_admin)):
    await db.events.delete_one({"id": eid})
    return {"message": "OK"}

# ===== Push =====
@api_router.post("/push/register")
async def reg_push(inp: PushTokenRegister):
    cats = inp.categories if inp.categories else ["all"]
    await db.push_tokens.update_one(
        {"token": inp.token},
        {"$set": {"token": inp.token, "platform": inp.platform, "active": inp.enabled,
                  "categories": cats, "registered_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "OK"}

@api_router.put("/push/preferences")
async def update_push_prefs(inp: PushPreferencesUpdate):
    cats = inp.categories if inp.categories else ["all"]
    await db.push_tokens.update_one(
        {"token": inp.token},
        {"$set": {"active": inp.enabled, "categories": cats}}
    )
    return {"status": "ok"}

@api_router.post("/push/unregister")
async def unreg_push(inp: PushTokenRegister):
    await db.push_tokens.update_one({"token": inp.token}, {"$set": {"active": False}})
    return {"message": "OK"}

@api_router.get("/admin/notifications")
async def get_notifs(user: dict = Depends(require_admin)):
    return await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)

@api_router.post("/admin/notifications/send")
async def send_notif(inp: NotificationCreate, user: dict = Depends(require_admin)):
    # Build query: active tokens + optional category filter
    query: dict = {"active": True}
    if inp.target_category:
        query["$or"] = [{"categories": inp.target_category}, {"categories": "all"}]
    tokens_docs = await db.push_tokens.find(query, {"_id": 0}).to_list(10000)

    # Smart rate limiting: max 2 push notifications per device per day
    if inp.smart_limit:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        tokens_docs = [
            t for t in tokens_docs
            if t.get("daily_date") != today or t.get("daily_count", 0) < 2
        ]

    valid = [t["token"] for t in tokens_docs if t.get("token")]
    total, ok, fail = len(valid), 0, 0

    # Check quiet hours (Bosnia UTC+1, approx UTC+1)
    local_hour = (datetime.now(timezone.utc).hour + 1) % 24
    is_quiet = local_hour >= 22 or local_hour < 8

    if valid:
        chunks = [valid[i:i+100] for i in range(0, len(valid), 100)]
        async with httpx.AsyncClient() as hc:
            for chunk in chunks:
                try:
                    payload = [{"to": t, "sound": "default", "title": inp.title, "body": inp.body} for t in chunk]
                    resp = await hc.post(EXPO_PUSH_URL, json=payload, timeout=30.0)
                    if resp.status_code == 200:
                        for ticket in resp.json().get("data", []):
                            if ticket.get("status") == "ok": ok += 1
                            else: fail += 1
                    else: fail += len(chunk)
                except: fail += len(chunk)
        # Update daily rate limit counts (efficient bulk update with aggregation pipeline)
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        await db.push_tokens.update_many(
            {"token": {"$in": valid}},
            [{"$set": {
                "daily_count": {"$cond": [
                    {"$eq": ["$daily_date", today]},
                    {"$add": [{"$ifNull": ["$daily_count", 0]}, 1]},
                    1
                ]},
                "daily_date": today
            }}]
        )

    rec = {"id": str(uuid.uuid4()), "title": inp.title, "body": inp.body,
           "target_category": inp.target_category, "total_devices": total,
           "successful": ok, "failed": fail, "quiet_hours": is_quiet,
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.notifications.insert_one(dict(rec))
    return rec

@api_router.get("/admin/push-stats")
async def push_stats(category: Optional[str] = None, user: dict = Depends(require_admin)):
    total = await db.push_tokens.count_documents({"active": True})
    if category:
        targeted = await db.push_tokens.count_documents({
            "active": True,
            "$or": [{"categories": category}, {"categories": "all"}]
        })
    else:
        targeted = total
    local_hour = (datetime.now(timezone.utc).hour + 1) % 24
    return {
        "active_devices": total,
        "targeted_devices": targeted,
        "quiet_hours": local_hour >= 22 or local_hour < 8,
        "quiet_hours_range": "22:00 – 08:00",
        "current_hour_local": local_hour,
    }

# ===== Settings =====
@api_router.get("/settings")
async def get_settings():
    s = await db.app_settings.find_one({"id": "main"}, {"_id": 0})
    return s or {"id": "main", "paypal_link": "", "contact_email": "info@gradacac-mapa.ba"}

@api_router.put("/admin/settings")
async def update_settings(inp: AppSettingsUpdate, user: dict = Depends(require_admin)):
    u = {k: v for k, v in inp.dict().items() if v is not None}
    if not u: raise HTTPException(400)
    await db.app_settings.update_one({"id": "main"}, {"$set": {**u, "id": "main"}}, upsert=True)
    return await db.app_settings.find_one({"id": "main"}, {"_id": 0})

# ===== Loyalty / Points =====
class LoyaltyAction(BaseModel):
    user_name: str
    location_id: str

@api_router.post("/loyalty/checkin")
async def loyalty_checkin(inp: LoyaltyAction):
    """User checks in at location via QR scan - earns points"""
    loc = await db.locations.find_one({"id": inp.location_id})
    if not loc: raise HTTPException(404)
    await db.loyalty.update_one(
        {"user_name": inp.user_name.lower()},
        {"$inc": {"points": 10, "total_visits": 1}, "$push": {"visits": {"location_id": inp.location_id, "location_name": loc["name"], "date": datetime.now(timezone.utc).isoformat()}}, "$set": {"user_name": inp.user_name.lower()}},
        upsert=True
    )
    user_loyalty = await db.loyalty.find_one({"user_name": inp.user_name.lower()}, {"_id": 0})
    if not user_loyalty:
        # Fallback in case of race condition
        return {"points": 10, "total_visits": 1, "message": "+10 bodova!"}
    pts = user_loyalty.get("points", 10)
    vis = user_loyalty.get("total_visits", 1)
    return {"points": pts, "total_visits": vis, "message": "+10 bodova!"}

@api_router.get("/loyalty/{user_name}")
async def get_loyalty(user_name: str):
    data = await db.loyalty.find_one({"user_name": user_name.lower()}, {"_id": 0})
    if not data: return {"user_name": user_name, "points": 0, "total_visits": 0, "visits": []}
    return data

# ===== Chat / Messages =====
class MessageCreate(BaseModel):
    sender_name: str
    message: str

@api_router.post("/locations/{lid}/messages")
async def send_message(lid: str, inp: MessageCreate):
    loc = await db.locations.find_one({"id": lid})
    if not loc: raise HTTPException(404)
    msg = {"id": str(uuid.uuid4()), "location_id": lid, "sender_name": inp.sender_name, "message": inp.message, "reply": None, "created_at": datetime.now(timezone.utc).isoformat()}
    to_ins = dict(msg)
    await db.messages.insert_one(to_ins)
    return msg

@api_router.get("/locations/{lid}/messages")
async def get_messages(lid: str):
    return await db.messages.find({"location_id": lid}, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.put("/business/messages/{mid}/reply")
async def reply_message(mid: str, inp: MessageCreate, user: dict = Depends(require_business_or_admin)):
    await db.messages.update_one({"id": mid}, {"$set": {"reply": inp.message, "replied_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Odgovor poslan"}

# ===== Tourism / Attractions =====
ATTRACTIONS = [
    {"id": "1", "name": "Gradačačka tvrđava", "description": "Srednjovjekovna tvrđava iz 15. vijeka, simbol grada Gradačca. Poznata kao Husejn-kapetanova kula.", "latitude": 44.8802, "longitude": 18.4260, "category": "Historija"},
    {"id": "2", "name": "Husejnija džamija", "description": "Glavna džamija u centru grada, izgrađena u osmanskom periodu.", "latitude": 44.8798, "longitude": 18.4268, "category": "Religija"},
    {"id": "3", "name": "Gradski park", "description": "Zelena oaza u centru grada za odmor i rekreaciju.", "latitude": 44.8790, "longitude": 18.4280, "category": "Priroda"},
    {"id": "4", "name": "Savska promenada", "description": "Šetalište uz rijeku, idealno za trčanje i biciklizam.", "latitude": 44.8810, "longitude": 18.4300, "category": "Priroda"},
    {"id": "5", "name": "Muzej Gradačac", "description": "Gradski muzej sa eksponatima iz bogate historije grada.", "latitude": 44.8795, "longitude": 18.4265, "category": "Kultura"},
]

@api_router.get("/tourism/attractions")
async def get_attractions():
    db_attrs = await db.attractions.find({}, {"_id": 0}).to_list(100)
    if db_attrs: return db_attrs
    # Seed defaults on first call
    for a in ATTRACTIONS: await db.attractions.insert_one(dict(a))
    return ATTRACTIONS

@api_router.get("/tourism/attractions/{aid}")
async def get_attraction(aid: str):
    attr = await db.attractions.find_one({"id": aid}, {"_id": 0})
    if not attr: raise HTTPException(404, "Not Found")
    return attr

class AttractionCreate(BaseModel):
    name: str
    description: str = ""
    content_html: str = ""
    short_description: str = ""
    latitude: float = 44.8797
    longitude: float = 18.4275
    category: str = "Ostalo"
    images: list = []
    website: str = ""
    working_hours: str = ""
    admission_price: str = ""
    phone: str = ""

class AttractionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content_html: Optional[str] = None
    short_description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
    images: Optional[list] = None
    website: Optional[str] = None
    working_hours: Optional[str] = None
    admission_price: Optional[str] = None
    phone: Optional[str] = None

@api_router.post("/admin/tourism/attractions")
async def create_attraction(inp: AttractionCreate, user: dict = Depends(require_admin)):
    attr = {"id": str(uuid.uuid4()), **inp.dict()}
    to_ins = dict(attr)
    await db.attractions.insert_one(to_ins)
    return attr

@api_router.put("/admin/tourism/attractions/{aid}")
async def update_attraction(aid: str, inp: AttractionUpdate, user: dict = Depends(require_admin)):
    u = {k: v for k, v in inp.dict().items() if v is not None}
    if not u: raise HTTPException(400)
    r = await db.attractions.update_one({"id": aid}, {"$set": u})
    if r.matched_count == 0: raise HTTPException(404)
    return await db.attractions.find_one({"id": aid}, {"_id": 0})

@api_router.delete("/admin/tourism/attractions/{aid}")
async def delete_attraction(aid: str, user: dict = Depends(require_admin)):
    r = await db.attractions.delete_one({"id": aid})
    if r.deleted_count == 0: raise HTTPException(404)
    return {"message": "OK"}

# ===== Nearby Parkings =====
@api_router.get("/parkings/nearby")
async def get_nearby_parkings(lat: float = Query(...), lng: float = Query(...)):
    """Returns parking locations sorted by distance from given coords"""
    parkings = await db.locations.find({"category": "parking"}, {"_id": 0}).to_list(100)
    result = []
    for p in parkings:
        dist = calc_distance(lat, lng, p.get("latitude", 0), p.get("longitude", 0))
        result.append({**p, "distance": int(dist)})
    result.sort(key=lambda x: x["distance"])
    return result

# ===== Emergency Contacts =====
@api_router.get("/emergency-contacts")
async def get_emergency_contacts():
    return await db.emergency_contacts.find({}, {"_id": 0}).sort([("section", 1), ("order", 1)]).to_list(100)

@api_router.post("/admin/emergency-contacts")
async def create_emergency_contact(inp: EmergencyContactCreate, user: dict = Depends(require_admin)):
    ec = {"id": str(uuid.uuid4()), **inp.dict()}
    await db.emergency_contacts.insert_one(dict(ec))
    return {k: v for k, v in ec.items() if k != '_id'}

@api_router.put("/admin/emergency-contacts/{cid}")
async def update_emergency_contact(cid: str, inp: EmergencyContactUpdate, user: dict = Depends(require_admin)):
    u = {k: v for k, v in inp.dict().items() if v is not None}
    if not u: raise HTTPException(400)
    r = await db.emergency_contacts.update_one({"id": cid}, {"$set": u})
    if r.matched_count == 0: raise HTTPException(404)
    return await db.emergency_contacts.find_one({"id": cid}, {"_id": 0})

@api_router.delete("/admin/emergency-contacts/{cid}")
async def delete_emergency_contact(cid: str, user: dict = Depends(require_admin)):
    r = await db.emergency_contacts.delete_one({"id": cid})
    if r.deleted_count == 0: raise HTTPException(404)
    return {"message": "OK"}

# ===== News =====
@api_router.get("/news")
async def get_news(published_only: bool = Query(True)):
    q = {"is_published": True} if published_only else {}
    return await db.news.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.get("/news/{nid}")
async def get_news_article(nid: str):
    item = await db.news.find_one({"id": nid}, {"_id": 0})
    if not item: raise HTTPException(404, "Not found")
    return item

@api_router.post("/admin/news")
async def create_news_article(inp: NewsCreate, user: dict = Depends(require_admin)):
    article = NewsArticle(**inp.dict()).dict()
    await db.news.insert_one(dict(article))
    return {k: v for k, v in article.items() if k != '_id'}

@api_router.put("/admin/news/{nid}")
async def update_news_article(nid: str, inp: NewsUpdate, user: dict = Depends(require_admin)):
    u = {k: v for k, v in inp.dict().items() if v is not None}
    if not u: raise HTTPException(400)
    r = await db.news.update_one({"id": nid}, {"$set": u})
    if r.matched_count == 0: raise HTTPException(404)
    return await db.news.find_one({"id": nid}, {"_id": 0})

@api_router.delete("/admin/news/{nid}")
async def delete_news_article(nid: str, user: dict = Depends(require_admin)):
    r = await db.news.delete_one({"id": nid})
    if r.deleted_count == 0: raise HTTPException(404)
    return {"message": "OK"}

# ===== Leaderboard =====
# ===== CMS Widgets =====
class WidgetCreate(BaseModel):
    position: str
    widget_type: str  # banner|text_block|featured_locations|featured_events|promo_card|news_highlight|html_block
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content: Optional[str] = None
    image: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    location_ids: List[str] = []
    event_ids: List[str] = []
    is_active: bool = True
    order: int = 0

class WidgetUpdate(BaseModel):
    position: Optional[str] = None
    widget_type: Optional[str] = None
    title: Optional[str] = None
    subtitle: Optional[str] = None
    content: Optional[str] = None
    image: Optional[str] = None
    button_text: Optional[str] = None
    button_url: Optional[str] = None
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    location_ids: Optional[List[str]] = None
    event_ids: Optional[List[str]] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None

def _w(w): w["id"] = str(w.pop("_id", "")); return w

@api_router.get("/cms/widgets")
async def get_widgets_public(position: Optional[str] = None):
    q = {"is_active": True}
    if position: q["position"] = position
    items = await db.cms_widgets.find(q).sort("order", 1).to_list(100)
    return [_w(i) for i in items]

@api_router.get("/admin/widgets")
async def get_widgets_admin(position: Optional[str] = None, user: dict = Depends(require_admin)):
    q = {}
    if position: q["position"] = position
    items = await db.cms_widgets.find(q).sort([("position", 1), ("order", 1)]).to_list(200)
    return [_w(i) for i in items]

@api_router.post("/admin/widgets")
async def create_widget(inp: WidgetCreate, user: dict = Depends(require_admin)):
    doc = inp.dict()
    doc["_id"] = str(uuid.uuid4())
    doc["created_at"] = datetime.now(timezone.utc)
    await db.cms_widgets.insert_one(doc)
    return _w(doc)

@api_router.put("/admin/widgets/{wid}")
async def update_widget(wid: str, inp: WidgetUpdate, user: dict = Depends(require_admin)):
    upd = {k: v for k, v in inp.dict().items() if v is not None}
    if not upd: raise HTTPException(400, "Nothing to update")
    await db.cms_widgets.update_one({"_id": wid}, {"$set": upd})
    updated = await db.cms_widgets.find_one({"_id": wid})
    if not updated: raise HTTPException(404, "Widget not found")
    return _w(updated)

@api_router.delete("/admin/widgets/{wid}")
async def delete_widget(wid: str, user: dict = Depends(require_admin)):
    await db.cms_widgets.delete_one({"_id": wid})
    return {"ok": True}

@api_router.put("/admin/widgets-reorder")
async def reorder_widgets(items: List[dict], user: dict = Depends(require_admin)):
    for item in items:
        await db.cms_widgets.update_one({"_id": item["id"]}, {"$set": {"order": item["order"]}})
    return {"ok": True}

# ===== Site Settings =====
DEFAULT_SITE_SETTINGS = {
    "primary_color": "#7C3AED",
    "accent_color": "#F59E0B",
    "site_title": "Gradačac Mapa",
    "site_subtitle": "Digitalni vodič kroz grad",
    "hero_title": "Otkrij Gradačac",
    "hero_subtitle": "Restorani, eventi, znamenitosti, hitni brojevi\ni sve korisne informacije na jednom mjestu.",
    "show_offers_section": "true",
    "show_events_section": "true",
    "show_news_section": "true",
    "show_attractions_section": "true",
    "cards_per_row": "4",
    "footer_text": "Sve što trebate znati o Gradačacu na jednom mjestu.",
    "footer_phone": "112",
    "footer_email": "info@gradacac-mapa.ba",
    "facebook_url": "https://facebook.com/gradacacmapa",
    "instagram_url": "https://instagram.com/gradacacmapa",
    "meta_title": "Gradačac Mapa - Digitalni Vodič",
    "meta_description": "Pronađite restorane, markete, servise, znamenitosti i sve informacije o Gradačacu na jednom mjestu.",
    "og_image": "",
    "google_verification": "",
    "google_analytics_id": "",
    "site_url": "",
}

@api_router.get("/site-settings")
async def get_site_settings_public():
    settings = {}
    async for doc in db.site_settings.find({}):
        settings[doc["key"]] = doc["value"]
    # Fill defaults for missing keys
    for k, v in DEFAULT_SITE_SETTINGS.items():
        if k not in settings:
            settings[k] = v
    return settings

@api_router.get("/admin/site-settings")
async def get_site_settings_admin(user: dict = Depends(require_admin)):
    settings = {}
    async for doc in db.site_settings.find({}):
        settings[doc["key"]] = doc["value"]
    for k, v in DEFAULT_SITE_SETTINGS.items():
        if k not in settings:
            settings[k] = v
    return settings

@api_router.put("/admin/site-settings")
async def update_site_settings(updates: dict, user: dict = Depends(require_admin)):
    for key, value in updates.items():
        await db.site_settings.update_one(
            {"key": key},
            {"$set": {"key": key, "value": str(value)}},
            upsert=True
        )
    return {"ok": True, "updated": list(updates.keys())}

@api_router.get("/leaderboard")
async def get_leaderboard(limit: int = Query(10)):
    """Top locations by rating and review count"""
    locs = await db.locations.find({"review_count": {"$gt": 0}}, {"_id": 0}).sort([("avg_rating", -1), ("review_count", -1)]).to_list(limit)
    return [{"id": l["id"], "name": l["name"], "category": l["category"], "avg_rating": l.get("avg_rating", 0), "review_count": l.get("review_count", 0), "images": l.get("images", [])[:1]} for l in locs]

# ===== CONTACT FORM =====
class ContactMessage(BaseModel):
    name: str
    email: str
    subject: Optional[str] = ""
    message: str

@api_router.post("/contact")
async def submit_contact(inp: ContactMessage):
    msg = {
        "id": str(uuid.uuid4()),
        "name": inp.name,
        "email": inp.email,
        "subject": inp.subject or "",
        "message": inp.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False,
    }
    await db.contact_messages.insert_one(msg)
    return {"success": True, "message": "Poruka uspješno primljena."}

@api_router.get("/admin/contact-messages")
async def list_contact_messages(user: dict = Depends(require_admin)):
    msgs = await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return msgs

@api_router.put("/admin/contact-messages/{mid}/read")
async def mark_message_read(mid: str, user: dict = Depends(require_admin)):
    await db.contact_messages.update_one({"id": mid}, {"$set": {"read": True}})
    return {"success": True}

@api_router.delete("/admin/contact-messages/{mid}")
async def delete_contact_message(mid: str, user: dict = Depends(require_admin)):
    await db.contact_messages.delete_one({"id": mid})
    return {"success": True}

# ===== SEO: Sitemap.xml =====
@api_router.get("/sitemap.xml", response_class=Response)
async def sitemap(request: Request):
    # Get canonical base from site settings
    settings = {}
    async for doc in db.site_settings.find({}):
        settings[doc["key"]] = doc["value"]
    base_url = settings.get("site_url", "").rstrip("/") or str(request.base_url).rstrip("/")
    city_base = f"{base_url}/api/city"

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    urls = []

    def url_entry(loc: str, lastmod: str = today, priority: str = "0.8", changefreq: str = "weekly"):
        return f"""  <url>
    <loc>{city_base}{loc}</loc>
    <lastmod>{lastmod}</lastmod>
    <changefreq>{changefreq}</changefreq>
    <priority>{priority}</priority>
  </url>"""

    # Static pages
    urls.append(url_entry("/", priority="1.0", changefreq="daily"))
    urls.append(url_entry("/lokacije", priority="0.9", changefreq="daily"))
    urls.append(url_entry("/dogadjaji", priority="0.9", changefreq="daily"))
    urls.append(url_entry("/vijesti", priority="0.9", changefreq="daily"))
    urls.append(url_entry("/znamenitosti", priority="0.8", changefreq="weekly"))
    urls.append(url_entry("/hitni-brojevi", priority="0.7", changefreq="monthly"))
    urls.append(url_entry("/o-aplikaciji", priority="0.5", changefreq="monthly"))

    # Dynamic: Locations
    async for loc in db.locations.find({}, {"id": 1, "updated_at": 1}):
        lid = loc.get("id") or str(loc.get("_id"))
        lmod = loc.get("updated_at", today)[:10] if loc.get("updated_at") else today
        urls.append(url_entry(f"/lokacije/{lid}", lastmod=lmod, priority="0.7"))

    # Dynamic: Events
    async for ev in db.events.find({}, {"id": 1, "updated_at": 1}):
        eid = ev.get("id") or str(ev.get("_id"))
        emod_raw = ev.get("updated_at", today)
        emod = emod_raw.strftime("%Y-%m-%d") if hasattr(emod_raw, 'strftime') else str(emod_raw)[:10]
        urls.append(url_entry(f"/dogadjaji/{eid}", lastmod=emod, priority="0.7"))

    # Dynamic: News
    async for n in db.news.find({}, {"id": 1, "created_at": 1}):
        nid = n.get("id") or str(n.get("_id"))
        nmod_raw = n.get("created_at", today)
        nmod = nmod_raw.strftime("%Y-%m-%d") if hasattr(nmod_raw, 'strftime') else str(nmod_raw)[:10]
        urls.append(url_entry(f"/vijesti/{nid}", lastmod=nmod, priority="0.7"))

    # Dynamic: Attractions
    async for a in db.attractions.find({}, {"id": 1}):
        aid = a.get("id") or str(a.get("_id"))
        urls.append(url_entry(f"/znamenitosti/{aid}", priority="0.6"))

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
{chr(10).join(urls)}
</urlset>"""
    return Response(content=xml, media_type="application/xml")

# ===== SEO: robots.txt =====
@api_router.get("/robots.txt", response_class=Response)
async def robots(request: Request):
    settings = {}
    async for doc in db.site_settings.find({}):
        settings[doc["key"]] = doc["value"]
    base_url = settings.get("site_url", "").rstrip("/") or str(request.base_url).rstrip("/")
    content = f"""User-agent: *
Allow: /api/city/
Disallow: /api/admin-panel/
Disallow: /api/business-panel/
Disallow: /api/admin/
Disallow: /api/auth/

Sitemap: {base_url}/api/sitemap.xml
"""
    return Response(content=content, media_type="text/plain")

# ===== Admin Business List =====
@api_router.get("/admin/admins")
async def list_admins(user: dict = Depends(require_admin)):
    admins = []
    async for u in db.users.find({"role": "admin"}):
        u.pop("_id", None); u.pop("password_hash", None)
        admins.append(u)
    return admins

@api_router.post("/admin/admins")
async def create_admin(inp: dict, user: dict = Depends(require_admin)):
    name = (inp.get("name") or "").strip()
    email = (inp.get("email") or "").strip().lower()
    password = inp.get("password") or ""
    if not name or not email or not password:
        raise HTTPException(400, "Naziv, email i lozinka su obavezni")
    if len(password) < 6:
        raise HTTPException(400, "Lozinka mora imati najmanje 6 znakova")
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email već postoji")
    uid = str(uuid.uuid4())
    await db.users.insert_one({
        "id": uid, "email": email, "name": name,
        "password_hash": hash_pw(password), "role": "admin",
        "created_at": datetime.now(timezone.utc)
    })
    return {"id": uid, "name": name, "email": email, "role": "admin"}

@api_router.put("/admin/admins/{uid}")
async def update_admin(uid: str, inp: dict, user: dict = Depends(require_admin)):
    upd: dict = {}
    if inp.get("name"): upd["name"] = inp["name"].strip()
    if inp.get("email"):
        email = inp["email"].strip().lower()
        existing = await db.users.find_one({"email": email})
        if existing and existing.get("id") != uid:
            raise HTTPException(400, "Email već postoji")
        upd["email"] = email
    if inp.get("password"):
        if len(inp["password"]) < 6:
            raise HTTPException(400, "Lozinka mora imati najmanje 6 znakova")
        upd["password_hash"] = hash_pw(inp["password"])
    if not upd:
        raise HTTPException(400, "Ništa za ažurirati")
    await db.users.update_one({"id": uid, "role": "admin"}, {"$set": upd})
    updated = await db.users.find_one({"id": uid})
    if not updated: raise HTTPException(404, "Admin nije pronađen")
    updated.pop("_id", None); updated.pop("password_hash", None)
    return updated

@api_router.delete("/admin/admins/{uid}")
async def delete_admin(uid: str, user: dict = Depends(require_admin)):
    if user.get("id") == uid:
        raise HTTPException(400, "Ne možete obrisati vlastiti nalog")
    target = await db.users.find_one({"id": uid, "role": "admin"})
    if not target:
        raise HTTPException(404, "Admin nije pronađen")
    await db.users.delete_one({"id": uid})
    return {"ok": True}


async def list_business_accounts(user: dict = Depends(require_admin)):
    users = await db.users.find({"role": "business"}).to_list(100)
    # Batch fetch locations (avoid N+1)
    loc_ids = list({u.get("location_id") for u in users if u.get("location_id")})
    loc_map = {}
    if loc_ids:
        locs = await db.locations.find({"id": {"$in": loc_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(None)
        loc_map = {l["id"]: l.get("name", "") for l in locs}
    result = []
    for u in users:
        result.append({"id": str(u["_id"]), "email": u["email"], "name": u.get("name", ""), "location_id": u.get("location_id", ""), "location_name": loc_map.get(u.get("location_id", ""), ""), "created_at": u.get("created_at", "")})
    return result

@api_router.delete("/admin/business-accounts/{uid}")
async def delete_business_account(uid: str, user: dict = Depends(require_admin)):
    await db.users.delete_one({"_id": ObjectId(uid), "role": "business"})
    return {"message": "OK"}

# ===== Reservations =====
import random as _random
import asyncio as _asyncio

async def _get_setting(key: str):
    doc = await db.site_settings.find_one({"key": key})
    return doc["value"] if doc and doc.get("value") else None

def _format_phone_ba(phone: str) -> str:
    """Format BiH phone number to E.164 format for Twilio"""
    p = phone.strip().replace(" ", "").replace("-", "")
    if p.startswith("+"):
        return p
    if p.startswith("00"):
        return "+" + p[2:]
    if p.startswith("0"):
        return "+387" + p[1:]
    return "+387" + p

async def _send_verification_email(to_email: str, code: str, location_name: str, date: str, time: str) -> bool:
    try:
        import resend as _resend
        api_key = await _get_setting("resend_api_key")
        sender = await _get_setting("resend_sender_email") or "noreply@gradacac-mapa.ba"
        if not api_key:
            return False
        _resend.api_key = api_key
        html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px;">
<div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#7C3AED,#5B21B6);padding:28px 24px;text-align:center;">
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">🗓️ Gradačac Mapa</h1>
    <p style="color:#e9d5ff;margin:6px 0 0;font-size:14px;">Verifikacija rezervacije</p>
  </div>
  <div style="padding:28px 24px;">
    <p style="color:#374151;font-size:15px;margin:0 0 8px;">Vaša rezervacija u <strong>{location_name}</strong></p>
    <p style="color:#6B7280;font-size:13px;margin:0 0 24px;">📅 {date} u {time}</p>
    <p style="color:#374151;font-size:14px;margin:0 0 12px;">Unesite ovaj kod u aplikaciju za potvrdu:</p>
    <div style="background:#F3F0FF;border:2px dashed #7C3AED;border-radius:12px;padding:20px;text-align:center;margin:0 0 20px;">
      <span style="font-size:42px;font-weight:900;letter-spacing:10px;color:#7C3AED;">{code}</span>
    </div>
    <p style="color:#9CA3AF;font-size:12px;margin:0;">⚠️ Kod važi <strong>30 minuta</strong>. Ako niste napravili ovu rezervaciju, ignorirajte ovaj email.</p>
  </div>
  <div style="background:#F9FAFB;padding:16px 24px;text-align:center;border-top:1px solid #E5E7EB;">
    <p style="color:#9CA3AF;font-size:11px;margin:0;">Gradačac Mapa – Digitalni vodič kroz grad</p>
  </div>
</div>
</body></html>"""
        await _asyncio.to_thread(_resend.Emails.send, {
            "from": sender, "to": [to_email],
            "subject": f"Kod za rezervaciju u {location_name}: {code}",
            "html": html
        })
        return True
    except Exception as e:
        print(f"[EMAIL] Send failed: {e}")
        return False

async def _send_verification_sms(to_phone: str, code: str, location_name: str) -> bool:
    try:
        from twilio.rest import Client as _TwilioClient
        sid = await _get_setting("twilio_account_sid")
        token = await _get_setting("twilio_auth_token")
        from_num = await _get_setting("twilio_from_number")
        if not sid or not token or not from_num:
            return False
        client = _TwilioClient(sid, token)
        msg = f"Gradacac Mapa: Vas verifikacioni kod za rezervaciju u {location_name} je: {code}. Vazi 30 min."
        formatted = _format_phone_ba(to_phone)
        await _asyncio.to_thread(client.messages.create, body=msg, from_=from_num, to=formatted)
        return True
    except Exception as e:
        print(f"[SMS] Send failed: {e}")
        return False

@api_router.get("/reservations/locations")
async def get_reservable_locations():
    """Fetch locations that accept reservations: restaurants, cafes, prenociste"""
    locs = await db.locations.find(
        {"category": {"$in": ["restaurant", "cafe", "prenociste"]}},
        {"_id": 0}
    ).to_list(None)
    return locs

@api_router.post("/reservations")
async def create_reservation(data: ReservationCreate):
    loc = await db.locations.find_one({"id": data.location_id})
    if not loc:
        raise HTTPException(404, "Lokacija nije pronađena")
    if loc["category"] not in ["restaurant", "cafe", "prenociste"]:
        raise HTTPException(400, "Ova lokacija ne prima rezervacije")
    code = str(_random.randint(100000, 999999))
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)
    reservation = {
        "id": str(uuid.uuid4()),
        "location_id": data.location_id,
        "location_name": loc["name"],
        "location_category": loc.get("category", ""),
        "reservation_type": data.reservation_type,
        "customer_name": data.customer_name,
        "customer_phone": data.customer_phone,
        "customer_email": data.customer_email,
        # Restaurant/Cafe
        "date": data.date,
        "time": data.time,
        "table_preference": data.table_preference,
        # Hotel
        "check_in_date": data.check_in_date,
        "check_out_date": data.check_out_date,
        "room_type": data.room_type,
        "bed_type": data.bed_type,
        # Common
        "guests": data.guests,
        "special_requests": data.special_requests,
        "status": "pending_verification",
        "verification_code": code,
        "verification_expires_at": expires_at,
        "created_at": datetime.now(timezone.utc),
    }
    await db.reservations.insert_one(reservation)

    # Try to send via SMS then email
    sent_via = None
    # Use check_in_date for hotels, date for restaurants
    display_date = data.check_in_date or data.date or ""
    display_time = data.time or "prijava"
    sms_ok = await _send_verification_sms(data.customer_phone, code, loc["name"])
    if sms_ok:
        sent_via = "sms"
    elif data.customer_email:
        email_ok = await _send_verification_email(data.customer_email, code, loc["name"], display_date, display_time)
        if email_ok:
            sent_via = "email"

    return {
        "reservation_id": reservation["id"],
        "verification_code": code if not sent_via else None,
        "show_code": sent_via is None,
        "sent_via": sent_via,
        "message": f"Kod je poslan putem {'SMS-a' if sent_via == 'sms' else 'e-maila' if sent_via == 'email' else 'prikazan u aplikaciji'}."
    }

@api_router.post("/reservations/verify")
async def verify_reservation(data: ReservationVerify):
    res = await db.reservations.find_one({"id": data.reservation_id})
    if not res:
        raise HTTPException(404, "Rezervacija nije pronađena")
    if res["status"] != "pending_verification":
        raise HTTPException(400, "Rezervacija je već verificirana")
    if res.get("verification_code") != data.code:
        raise HTTPException(400, "Netačan verifikacioni kod")
    exp = res.get("verification_expires_at")
    if exp:
        exp_dt = exp.replace(tzinfo=timezone.utc) if exp.tzinfo is None else exp
        if datetime.now(timezone.utc) > exp_dt:
            raise HTTPException(400, "Verifikacioni kod je istekao. Molimo napravite novu rezervaciju.")
    await db.reservations.update_one(
        {"id": data.reservation_id},
        {"$set": {"status": "pending", "verification_code": None, "verification_expires_at": None}}
    )
    return {"message": "Rezervacija uspješno verificirana! Čeka potvrdu lokacije."}

@api_router.get("/my-reservations")
async def get_my_reservations(phone: str = Query(..., min_length=6)):
    rsvs = await db.reservations.find(
        {"customer_phone": phone, "status": {"$ne": "pending_verification"}}
    ).sort("created_at", -1).to_list(None)
    return [{"id": r["id"], "location_name": r["location_name"], "location_category": r.get("location_category", ""),
              "reservation_type": r.get("reservation_type", "table"),
              "date": r.get("date"), "time": r.get("time"),
              "table_preference": r.get("table_preference"),
              "check_in_date": r.get("check_in_date"), "check_out_date": r.get("check_out_date"),
              "room_type": r.get("room_type"), "bed_type": r.get("bed_type"),
              "guests": r["guests"],
              "special_requests": r.get("special_requests"), "status": r["status"],
              "created_at": r["created_at"].isoformat() if r.get("created_at") else None} for r in rsvs]

@api_router.get("/business/reservations")
async def get_business_reservations(user: dict = Depends(require_business_or_admin)):
    query: dict = {"status": {"$ne": "pending_verification"}}
    if user["role"] == "business":
        query["location_id"] = user["location_id"]
    rsvs = await db.reservations.find(query).sort("date", 1).to_list(None)
    return [{"id": r["id"], "location_id": r["location_id"], "location_name": r["location_name"],
              "location_category": r.get("location_category", ""),
              "reservation_type": r.get("reservation_type", "table"),
              "customer_name": r["customer_name"], "customer_phone": r["customer_phone"],
              "customer_email": r.get("customer_email"),
              "date": r.get("date"), "time": r.get("time"),
              "table_preference": r.get("table_preference"),
              "check_in_date": r.get("check_in_date"), "check_out_date": r.get("check_out_date"),
              "room_type": r.get("room_type"), "bed_type": r.get("bed_type"),
              "guests": r["guests"], "special_requests": r.get("special_requests"),
              "status": r["status"], "business_note": r.get("business_note"),
              "created_at": r["created_at"].isoformat() if r.get("created_at") else None} for r in rsvs]

@api_router.get("/business/reservations/calendar")
async def get_reservations_calendar(
    year: int = Query(..., ge=2024, le=2030),
    month: int = Query(..., ge=1, le=12),
    user: dict = Depends(require_business_or_admin)
):
    import calendar as _cal
    import datetime as _dt
    query: dict = {"status": {"$in": ["pending", "confirmed"]}}
    if user["role"] == "business":
        query["location_id"] = user["location_id"]
    rsvs = await db.reservations.find(query).to_list(None)
    _, days_in_month = _cal.monthrange(year, month)
    daily: dict = {}

    def _add_day(date_str: str, r: dict, as_item: bool = True):
        if date_str not in daily:
            daily[date_str] = {"count": 0, "pending": 0, "confirmed": 0, "items": []}
        daily[date_str]["count"] += 1
        daily[date_str][r["status"]] = daily[date_str].get(r["status"], 0) + 1
        if as_item:
            rtype = r.get("reservation_type", "table")
            daily[date_str]["items"].append({
                "id": r["id"], "customer_name": r["customer_name"],
                "type": rtype, "status": r["status"], "guests": r.get("guests", 1),
                "time": r.get("time"), "table_preference": r.get("table_preference"),
                "check_in_date": r.get("check_in_date"), "check_out_date": r.get("check_out_date"),
                "room_type": r.get("room_type"), "bed_type": r.get("bed_type"),
            })

    for r in rsvs:
        rtype = r.get("reservation_type", "table")
        if rtype == "table":
            ds = r.get("date")
            if ds:
                try:
                    d = _dt.date.fromisoformat(ds)
                    if d.year == year and d.month == month:
                        _add_day(ds, r, True)
                except Exception:
                    pass
        else:
            ci_s, co_s = r.get("check_in_date"), r.get("check_out_date")
            if ci_s and co_s:
                try:
                    ci, co = _dt.date.fromisoformat(ci_s), _dt.date.fromisoformat(co_s)
                    cur = ci
                    while cur < co:
                        if cur.year == year and cur.month == month:
                            _add_day(cur.isoformat(), r, cur == ci)
                        cur += _dt.timedelta(days=1)
                except Exception:
                    pass

    return {
        "year": year, "month": month,
        "days_in_month": days_in_month,
        "first_weekday": _cal.monthrange(year, month)[0],
        "daily": daily,
    }

@api_router.put("/business/reservations/{reservation_id}/status")
async def update_reservation_status(reservation_id: str, data: ReservationStatusUpdate, user: dict = Depends(require_business_or_admin)):
    res = await db.reservations.find_one({"id": reservation_id})
    if not res:
        raise HTTPException(404, "Rezervacija nije pronađena")
    if user["role"] == "business" and res["location_id"] != user["location_id"]:
        raise HTTPException(403, "Nema pristupa ovoj rezervaciji")
    if data.status not in ["confirmed", "cancelled", "completed"]:
        raise HTTPException(400, "Nevažeći status")
    await db.reservations.update_one(
        {"id": reservation_id},
        {"$set": {"status": data.status, "business_note": data.note, "updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Status rezervacije ažuriran"}

@api_router.get("/admin/reservations")
async def get_all_reservations(user: dict = Depends(require_admin)):
    rsvs = await db.reservations.find({"status": {"$ne": "pending_verification"}}).sort("created_at", -1).to_list(None)
    return [{"id": r["id"], "location_name": r["location_name"],
              "location_category": r.get("location_category", ""),
              "reservation_type": r.get("reservation_type", "table"),
              "customer_name": r["customer_name"], "customer_phone": r["customer_phone"],
              "customer_email": r.get("customer_email"),
              "date": r.get("date"), "time": r.get("time"),
              "table_preference": r.get("table_preference"),
              "check_in_date": r.get("check_in_date"), "check_out_date": r.get("check_out_date"),
              "room_type": r.get("room_type"), "bed_type": r.get("bed_type"),
              "guests": r["guests"], "special_requests": r.get("special_requests"),
              "status": r["status"],
              "created_at": r["created_at"].isoformat() if r.get("created_at") else None} for r in rsvs]

# ===== Admin Web Panel (Static Files) =====
ADMIN_PANEL_DIR = Path(__file__).parent / "admin-panel-dist"

@api_router.get("/admin-panel", include_in_schema=False)
@api_router.get("/admin-panel/", include_in_schema=False)
async def serve_admin_root():
    index = ADMIN_PANEL_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse("<h1>Admin panel nije izgrađen.</h1><p>Pokrenite: cd /app/web-admin && npm run build && cp -r dist/* ../backend/admin-panel-dist/</p>")

@api_router.get("/admin-panel/{path:path}", include_in_schema=False)
async def serve_admin_panel(path: str):
    if not ADMIN_PANEL_DIR.exists():
        return HTMLResponse("<h1>Admin panel nije izgrađen.</h1>")
    file_path = ADMIN_PANEL_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    index = ADMIN_PANEL_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse("<h1>Not found</h1>")

# ===== Business Web Panel (Static Files) =====
BUSINESS_PANEL_DIR = Path(__file__).parent / "business-panel-dist"

@api_router.get("/business-panel", include_in_schema=False)
@api_router.get("/business-panel/", include_in_schema=False)
async def serve_business_root():
    index = BUSINESS_PANEL_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse("<h1>Biznis panel nije izgrađen.</h1>")

@api_router.get("/business-panel/{path:path}", include_in_schema=False)
async def serve_business_panel(path: str):
    if not BUSINESS_PANEL_DIR.exists():
        return HTMLResponse("<h1>Biznis panel nije izgrađen.</h1>")
    file_path = BUSINESS_PANEL_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    index = BUSINESS_PANEL_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse("<h1>Not found</h1>")

# ===== City Web Guide (Static Files) =====
CITY_WEB_DIR = Path(__file__).parent / "web-city-dist"

@api_router.get("/city", include_in_schema=False)
@api_router.get("/city/", include_in_schema=False)
async def serve_city_root():
    index = CITY_WEB_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse("<h1>City web guide nije izgrađen.</h1>")

@api_router.get("/city/{path:path}", include_in_schema=False)
async def serve_city_web(path: str):
    if not CITY_WEB_DIR.exists():
        return HTMLResponse("<h1>City web guide nije izgrađen.</h1>")
    file_path = CITY_WEB_DIR / path
    if file_path.exists() and file_path.is_file():
        return FileResponse(file_path)
    # SPA fallback: return index.html for all routes
    index = CITY_WEB_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return HTMLResponse("<h1>Not found</h1>")

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("shutdown")
async def shutdown(): client.close()
