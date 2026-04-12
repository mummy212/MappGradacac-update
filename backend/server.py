from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response, Depends, UploadFile, File, Form
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
import base64
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@gradacac.ba')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Gradacac2024!')

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ========== Auth helpers ==========
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(hours=24), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "user")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except (jwt.InvalidTokenError, Exception):
        raise HTTPException(status_code=401, detail="Invalid token")

# ========== Models ==========
class Location(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    description: Optional[str] = None
    working_hours: Optional[str] = None
    is_premium: bool = False
    images: List[str] = []  # base64 encoded images
    service_tags: List[str] = []  # e.g. ["Ćevapi", "Pizza", "Domaća hrana"]
    price_level: int = 0  # 0=not set, 1=€, 2=€€, 3=€€€
    avg_rating: float = 0.0
    review_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationCreate(BaseModel):
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    description: Optional[str] = None
    working_hours: Optional[str] = None
    is_premium: bool = False
    service_tags: List[str] = []
    price_level: int = 0

class LocationUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    working_hours: Optional[str] = None
    is_premium: Optional[bool] = None
    service_tags: Optional[List[str]] = None
    price_level: Optional[int] = None

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    location_id: str
    author_name: str
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ReviewCreate(BaseModel):
    author_name: str
    stars: int = Field(ge=1, le=5)
    comment: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class Category(BaseModel):
    id: str
    name: str
    icon: str
    color: str

CATEGORIES = [
    {"id": "restaurant", "name": "Restorani", "icon": "restaurant", "color": "#FF6B6B"},
    {"id": "market", "name": "Marketi", "icon": "cart", "color": "#4ECDC4"},
    {"id": "auto_service", "name": "Auto Servisi", "icon": "car", "color": "#45B7D1"},
    {"id": "cafe", "name": "Kafići", "icon": "cafe", "color": "#96CEB4"},
    {"id": "pharmacy", "name": "Ljekarne", "icon": "medkit", "color": "#FFEAA7"},
    {"id": "gas_station", "name": "Benzinske", "icon": "water", "color": "#DDA0DD"},
]

SAMPLE_LOCATIONS = [
    {"name": "Restoran Stari Grad", "category": "restaurant", "address": "Husein-kapetana Gradaščevića bb", "latitude": 44.8797, "longitude": 18.4275, "phone": "+387 35 817 000", "description": "Tradicionalna bosanska kuhinja sa autentičnim receptima. Poznati po čorbama, pirama i ćevapima. Ugodan ambijent sa pogledom na stari grad.", "working_hours": "08:00 - 23:00", "service_tags": ["Bosanska kuhinja", "Ćevapi", "Pire"], "price_level": 2},
    {"name": "Restoran Zmaj", "category": "restaurant", "address": "Zmaja od Bosne 12", "latitude": 44.8785, "longitude": 18.4290, "phone": "+387 35 818 111", "description": "Roštilj i domaća jela. Veliki izbor mesa sa roštilja i specijaliteta. Prostran prostor za proslave.", "working_hours": "10:00 - 23:00", "service_tags": ["Roštilj", "Domaća hrana", "Proslave"], "price_level": 2},
    {"name": "Ćevabdžinica Kod Mehmeda", "category": "restaurant", "address": "Trg Husein-kapetana 5", "latitude": 44.8802, "longitude": 18.4268, "phone": "+387 35 817 222", "description": "Najbolji ćevapi u gradu. Tradicionalni recept koji se prenosi generacijama. Svježe pečeni somuni.", "working_hours": "08:00 - 22:00", "service_tags": ["Ćevapi", "Fast food", "Somun"], "price_level": 1},
    {"name": "Bingo", "category": "market", "address": "Željeznička bb", "latitude": 44.8770, "longitude": 18.4310, "phone": "+387 35 816 000", "description": "Najveći supermarket u gradu. Širok asortiman prehrambenih i neprehrambenih proizvoda. Svježe voće i povrće svaki dan.", "working_hours": "07:00 - 22:00", "service_tags": ["Supermarket", "Svježe voće", "Mesnica"], "price_level": 2},
    {"name": "Konzum", "category": "market", "address": "Titova 45", "latitude": 44.8792, "longitude": 18.4255, "phone": "+387 35 815 500", "description": "Prodavnica mješovite robe sa povoljnim cijenama i redovnim akcijama.", "working_hours": "07:00 - 21:00", "service_tags": ["Mješovita roba", "Akcije"], "price_level": 1},
    {"name": "Robot", "category": "market", "address": "Alije Izetbegovića 18", "latitude": 44.8812, "longitude": 18.4240, "phone": "+387 35 814 333", "description": "Mali market u centru grada. Praktičan za brzu kupovinu.", "working_hours": "06:00 - 22:00", "service_tags": ["Mini market", "Brza kupovina"], "price_level": 1},
    {"name": "Auto Servis Čamdžić", "category": "auto_service", "address": "Industrijska zona bb", "latitude": 44.8750, "longitude": 18.4350, "phone": "+387 35 820 100", "description": "Opravka svih vrsta vozila. Dijagnostika, mehanika, elektrika. Iskusni majstori sa dugogodišnjim iskustvom.", "working_hours": "08:00 - 17:00", "service_tags": ["Mehanika", "Dijagnostika", "Elektrika"], "price_level": 2},
    {"name": "Vulkanizer Mehić", "category": "auto_service", "address": "Magistralni put bb", "latitude": 44.8730, "longitude": 18.4380, "phone": "+387 35 821 200", "description": "Gume i vulkanizacija. Prodaja novih i polovnih guma. Balansiranje i zamjena.", "working_hours": "07:00 - 19:00", "service_tags": ["Vulkanizacija", "Gume", "Balansiranje"], "price_level": 1},
    {"name": "Auto Perionica", "category": "auto_service", "address": "Orašje put 5", "latitude": 44.8820, "longitude": 18.4200, "phone": "+387 35 822 300", "description": "Ručno pranje vozila. Unutrašnje i vanjsko čišćenje. Poliranje i zaštita laka.", "working_hours": "08:00 - 20:00", "service_tags": ["Pranje", "Poliranje", "Čišćenje"], "price_level": 1},
    {"name": "Caffe Bar Central", "category": "cafe", "address": "Trg Husein-kapetana 1", "latitude": 44.8800, "longitude": 18.4270, "phone": "+387 35 817 444", "description": "Kafa i kolači u srcu grada. Terasa sa pogledom na trg. Odličan espresso i domaći kolači.", "working_hours": "07:00 - 24:00", "service_tags": ["Espresso", "Kolači", "Terasa"], "price_level": 2},
    {"name": "Caffé di Milano", "category": "cafe", "address": "H.K. Gradaščevića 25", "latitude": 44.8795, "longitude": 18.4282, "phone": "+387 35 818 555", "description": "Moderni espresso bar sa italijanskim stilom. Širok izbor kafa i napitaka.", "working_hours": "08:00 - 23:00", "service_tags": ["Espresso", "Kokteli", "WiFi"], "price_level": 2},
    {"name": "Slastičarna Ledo", "category": "cafe", "address": "Titova 30", "latitude": 44.8788, "longitude": 18.4260, "phone": "+387 35 819 666", "description": "Sladoled i kolači. Veliki izbor sladoleda i torti za sve prilike.", "working_hours": "09:00 - 22:00", "service_tags": ["Sladoled", "Torte", "Kolači"], "price_level": 1},
    {"name": "Apoteka Gradačac", "category": "pharmacy", "address": "Titova 10", "latitude": 44.8798, "longitude": 18.4265, "phone": "+387 35 815 111", "description": "Glavna gradska apoteka sa širokim asortimanom lijekova i kozmetike.", "working_hours": "07:00 - 20:00", "service_tags": ["Lijekovi", "Kozmetika", "Vitamini"], "price_level": 2},
    {"name": "Apoteka Zdravlje", "category": "pharmacy", "address": "Alije Izetbegovića 5", "latitude": 44.8808, "longitude": 18.4250, "phone": "+387 35 816 222", "description": "Apoteka sa širokim asortimanom. Stručno savjetovanje i brza usluga.", "working_hours": "08:00 - 21:00", "service_tags": ["Lijekovi", "Savjetovanje"], "price_level": 2},
    {"name": "NIS Petrol", "category": "gas_station", "address": "Magistralni put bb", "latitude": 44.8720, "longitude": 18.4400, "phone": "+387 35 825 000", "description": "Benzinska pumpa sa 24h radnim vremenom. Benzin, dizel i LPG.", "working_hours": "00:00 - 24:00", "service_tags": ["Benzin", "Dizel", "LPG", "24h"], "price_level": 2},
    {"name": "Hifa Petrol", "category": "gas_station", "address": "Ulaz u grad bb", "latitude": 44.8850, "longitude": 18.4150, "phone": "+387 35 826 000", "description": "Benzinska i auto gas. Prodavnica na pumpi sa grickalicama i pićima.", "working_hours": "06:00 - 22:00", "service_tags": ["Benzin", "Auto gas", "Prodavnica"], "price_level": 2},
]

# ========== Startup ==========
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.reviews.create_index("location_id")
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({"email": ADMIN_EMAIL, "password_hash": hash_password(ADMIN_PASSWORD), "name": "Admin", "role": "admin", "created_at": datetime.now(timezone.utc)})
        logging.info(f"Admin seeded: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
    # Seed locations - drop and reseed to update with new fields
    count = await db.locations.count_documents({})
    has_tags = await db.locations.find_one({"service_tags": {"$exists": True, "$ne": []}})
    if count == 0 or not has_tags:
        await db.locations.delete_many({})
        for loc in SAMPLE_LOCATIONS:
            location = Location(**loc)
            await db.locations.insert_one(location.dict())
        logging.info(f"Seeded {len(SAMPLE_LOCATIONS)} locations with extended data")

async def recalc_rating(location_id: str):
    pipeline = [{"$match": {"location_id": location_id}}, {"$group": {"_id": None, "avg": {"$avg": "$stars"}, "cnt": {"$sum": 1}}}]
    result = await db.reviews.aggregate(pipeline).to_list(1)
    if result:
        await db.locations.update_one({"id": location_id}, {"$set": {"avg_rating": round(result[0]["avg"], 1), "review_count": result[0]["cnt"]}})
    else:
        await db.locations.update_one({"id": location_id}, {"$set": {"avg_rating": 0, "review_count": 0}})

# ========== Auth Routes ==========
@api_router.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    user = await db.users.find_one({"email": req.email.lower()})
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Pogrešan email ili lozinka")
    token = create_access_token(str(user["_id"]), user["email"])
    response.set_cookie(key="access_token", value=token, httponly=True, secure=False, samesite="lax", max_age=86400, path="/")
    return {"id": str(user["_id"]), "email": user["email"], "name": user.get("name", ""), "role": user.get("role", "user"), "token": token}

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

# ========== Public Routes ==========
@api_router.get("/")
async def root():
    return {"message": "Gradačac City Map API", "version": "2.0"}

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    return [Category(**cat) for cat in CATEGORIES]

@api_router.get("/locations")
async def get_locations(category: Optional[str] = Query(None)):
    query = {}
    if category:
        query["category"] = category
    locations = await db.locations.find(query, {"_id": 0}).to_list(1000)
    return locations

@api_router.get("/locations/{location_id}")
async def get_location(location_id: str):
    location = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@api_router.get("/search")
async def search_locations(q: str = Query(..., min_length=2)):
    locations = await db.locations.find({
        "$or": [{"name": {"$regex": q, "$options": "i"}}, {"address": {"$regex": q, "$options": "i"}}]
    }, {"_id": 0}).to_list(100)
    return locations

# ========== Reviews (Public) ==========
@api_router.get("/locations/{location_id}/reviews")
async def get_reviews(location_id: str):
    reviews = await db.reviews.find({"location_id": location_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return reviews

@api_router.post("/locations/{location_id}/reviews")
async def create_review(location_id: str, input: ReviewCreate):
    loc = await db.locations.find_one({"id": location_id})
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    review = Review(location_id=location_id, **input.dict())
    await db.reviews.insert_one(review.dict())
    await recalc_rating(location_id)
    return review.dict()

# ========== Admin Routes (Protected) ==========
@api_router.post("/admin/locations")
async def admin_create_location(input: LocationCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    location = Location(**input.dict())
    await db.locations.insert_one(location.dict())
    return location.dict()

@api_router.put("/admin/locations/{location_id}")
async def admin_update_location(location_id: str, input: LocationUpdate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    result = await db.locations.update_one({"id": location_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    updated = await db.locations.find_one({"id": location_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/locations/{location_id}")
async def admin_delete_location(location_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.locations.delete_one({"id": location_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    await db.reviews.delete_many({"location_id": location_id})
    return {"message": "Lokacija obrisana"}

# Image upload for location (admin)
@api_router.post("/admin/locations/{location_id}/images")
async def upload_image(location_id: str, file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    loc = await db.locations.find_one({"id": location_id})
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Slika ne smije biti veća od 5MB")
    b64 = base64.b64encode(content).decode("utf-8")
    mime = file.content_type or "image/jpeg"
    data_uri = f"data:{mime};base64,{b64}"
    await db.locations.update_one({"id": location_id}, {"$push": {"images": data_uri}})
    return {"message": "Slika dodana", "image": data_uri}

@api_router.delete("/admin/locations/{location_id}/images/{image_index}")
async def delete_image(location_id: str, image_index: int, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    loc = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    images = loc.get("images", [])
    if image_index < 0 or image_index >= len(images):
        raise HTTPException(status_code=400, detail="Invalid image index")
    images.pop(image_index)
    await db.locations.update_one({"id": location_id}, {"$set": {"images": images}})
    return {"message": "Slika obrisana"}

# Admin delete review
@api_router.delete("/admin/reviews/{review_id}")
async def admin_delete_review(review_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    review = await db.reviews.find_one({"id": review_id})
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    location_id = review["location_id"]
    await db.reviews.delete_one({"id": review_id})
    await recalc_rating(location_id)
    return {"message": "Recenzija obrisana"}

# ========== Push Notifications ==========
class PushTokenRegister(BaseModel):
    token: str
    platform: str = "unknown"

class NotificationCreate(BaseModel):
    title: str
    body: str

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

@api_router.post("/push/register")
async def register_push_token(input: PushTokenRegister):
    """Register device push token (public - any user)"""
    if not input.token:
        raise HTTPException(status_code=400, detail="Token required")
    await db.push_tokens.update_one(
        {"token": input.token},
        {"$set": {"token": input.token, "platform": input.platform, "active": True, "registered_at": datetime.now(timezone.utc)}},
        upsert=True
    )
    return {"message": "Token registered"}

@api_router.post("/push/unregister")
async def unregister_push_token(input: PushTokenRegister):
    """Unregister/deactivate push token"""
    await db.push_tokens.update_one({"token": input.token}, {"$set": {"active": False}})
    return {"message": "Token deactivated"}

@api_router.get("/admin/notifications")
async def get_notifications(user: dict = Depends(get_current_user)):
    """Get notification history (admin)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    notifs = await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return notifs

@api_router.post("/admin/notifications/send")
async def send_notification(input: NotificationCreate, user: dict = Depends(get_current_user)):
    """Send push notification to all active devices (admin)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    tokens = await db.push_tokens.find({"active": True}, {"_id": 0}).to_list(10000)
    valid_tokens = [t["token"] for t in tokens if t.get("token")]
    total = len(valid_tokens)
    successful = 0
    failed = 0
    if valid_tokens:
        import httpx
        chunks = [valid_tokens[i:i+100] for i in range(0, len(valid_tokens), 100)]
        async with httpx.AsyncClient() as client_http:
            for chunk in chunks:
                try:
                    payload = [{"to": tok, "sound": "default", "title": input.title, "body": input.body} for tok in chunk]
                    resp = await client_http.post(EXPO_PUSH_URL, json=payload, timeout=30.0)
                    if resp.status_code == 200:
                        for ticket in resp.json().get("data", []):
                            if ticket.get("status") == "ok":
                                successful += 1
                            else:
                                failed += 1
                    else:
                        failed += len(chunk)
                except Exception as e:
                    logging.error(f"Push error: {e}")
                    failed += len(chunk)
    notif_record = {
        "id": str(uuid.uuid4()), "title": input.title, "body": input.body,
        "total_devices": total, "successful": successful, "failed": failed,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    to_insert = dict(notif_record)
    await db.notifications.insert_one(to_insert)
    return notif_record

@api_router.get("/admin/push-stats")
async def get_push_stats(user: dict = Depends(get_current_user)):
    """Get push notification stats (admin)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    total = await db.push_tokens.count_documents({"active": True})
    return {"active_devices": total}

# ========== App Settings (Admin) ==========
class AppSettingsUpdate(BaseModel):
    paypal_link: Optional[str] = None
    contact_email: Optional[str] = None
    app_description: Optional[str] = None

@api_router.get("/settings")
async def get_settings():
    """Get public app settings (PayPal link, etc.)"""
    settings = await db.app_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        return {"id": "main", "paypal_link": "", "contact_email": "info@gradacac-mapa.ba", "app_description": ""}
    return settings

@api_router.put("/admin/settings")
async def update_settings(input: AppSettingsUpdate, user: dict = Depends(get_current_user)):
    """Update app settings (admin)"""
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    await db.app_settings.update_one({"id": "main"}, {"$set": update_data}, upsert=True)
    await db.app_settings.update_one({"id": "main"}, {"$set": {"id": "main"}}, upsert=True)
    settings = await db.app_settings.find_one({"id": "main"}, {"_id": 0})
    return settings

app.include_router(api_router)

app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
