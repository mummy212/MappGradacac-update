from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response, Depends, UploadFile, File
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os, logging, bcrypt, jwt, secrets, base64, math, re
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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LocationCreate(BaseModel):
    name: str; category: str; address: str; latitude: float; longitude: float
    phone: Optional[str] = None; description: Optional[str] = None
    working_hours: Optional[str] = None; is_premium: bool = False
    service_tags: List[str] = []; price_level: int = 0

class LocationUpdate(BaseModel):
    name: Optional[str] = None; category: Optional[str] = None; address: Optional[str] = None
    latitude: Optional[float] = None; longitude: Optional[float] = None
    phone: Optional[str] = None; description: Optional[str] = None
    working_hours: Optional[str] = None; is_premium: Optional[bool] = None
    service_tags: Optional[List[str]] = None; price_level: Optional[int] = None

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
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EventCreate(BaseModel):
    title: str; description: str; location_name: str
    date: str; time: Optional[str] = None; location_id: Optional[str] = None

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
class NotificationCreate(BaseModel):
    title: str = Field(min_length=1); body: str = Field(min_length=1)
class AppSettingsUpdate(BaseModel):
    paypal_link: Optional[str] = None; contact_email: Optional[str] = None

DEFAULT_CATEGORIES = [
    {"id": "restaurant", "name": "Restorani", "icon": "restaurant", "color": "#FF6B6B"},
    {"id": "market", "name": "Marketi", "icon": "cart", "color": "#4ECDC4"},
    {"id": "auto_service", "name": "Auto Servisi", "icon": "car", "color": "#45B7D1"},
    {"id": "cafe", "name": "Kafići", "icon": "cafe", "color": "#96CEB4"},
    {"id": "pharmacy", "name": "Ljekarne", "icon": "medkit", "color": "#FFEAA7"},
    {"id": "gas_station", "name": "Benzinske", "icon": "water", "color": "#DDA0DD"},
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

@api_router.post("/admin/events")
async def admin_create_event(inp: EventCreate, user: dict = Depends(require_business_or_admin)):
    e = Event(created_by=user["id"], **inp.dict())
    to_ins = dict(e.dict())
    await db.events.insert_one(to_ins)
    return e.dict()

@api_router.delete("/admin/events/{eid}")
async def admin_del_event(eid: str, user: dict = Depends(require_admin)):
    await db.events.delete_one({"id": eid})
    return {"message": "OK"}

# ===== Push =====
@api_router.post("/push/register")
async def reg_push(inp: PushTokenRegister):
    await db.push_tokens.update_one({"token": inp.token}, {"$set": {"token": inp.token, "platform": inp.platform, "active": True, "registered_at": datetime.now(timezone.utc)}}, upsert=True)
    return {"message": "OK"}

@api_router.post("/push/unregister")
async def unreg_push(inp: PushTokenRegister):
    await db.push_tokens.update_one({"token": inp.token}, {"$set": {"active": False}})
    return {"message": "OK"}

@api_router.get("/admin/notifications")
async def get_notifs(user: dict = Depends(require_admin)):
    return await db.notifications.find({}, {"_id": 0}).sort("created_at", -1).to_list(50)

@api_router.post("/admin/notifications/send")
async def send_notif(inp: NotificationCreate, user: dict = Depends(require_admin)):
    tokens = await db.push_tokens.find({"active": True}, {"_id": 0}).to_list(10000)
    valid = [t["token"] for t in tokens if t.get("token")]
    total, ok, fail = len(valid), 0, 0
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
    rec = {"id": str(uuid.uuid4()), "title": inp.title, "body": inp.body, "total_devices": total, "successful": ok, "failed": fail, "created_at": datetime.now(timezone.utc).isoformat()}
    to_ins = dict(rec)
    await db.notifications.insert_one(to_ins)
    return rec

@api_router.get("/admin/push-stats")
async def push_stats(user: dict = Depends(require_admin)):
    return {"active_devices": await db.push_tokens.count_documents({"active": True})}

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

class AttractionCreate(BaseModel):
    name: str
    description: str
    latitude: float = 44.8797
    longitude: float = 18.4275
    category: str = "Ostalo"

class AttractionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None

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

# ===== Leaderboard =====
@api_router.get("/leaderboard")
async def get_leaderboard(limit: int = Query(10)):
    """Top locations by rating and review count"""
    locs = await db.locations.find({"review_count": {"$gt": 0}}, {"_id": 0}).sort([("avg_rating", -1), ("review_count", -1)]).to_list(limit)
    return [{"id": l["id"], "name": l["name"], "category": l["category"], "avg_rating": l.get("avg_rating", 0), "review_count": l.get("review_count", 0), "images": l.get("images", [])[:1]} for l in locs]

# ===== Admin Business List =====
@api_router.get("/admin/business-accounts")
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

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

@app.on_event("shutdown")
async def shutdown(): client.close()
