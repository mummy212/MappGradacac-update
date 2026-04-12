from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Query, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta

# MongoDB connection
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
    {"name": "Restoran Stari Grad", "category": "restaurant", "address": "Husein-kapetana Gradaščevića bb", "latitude": 44.8797, "longitude": 18.4275, "phone": "+387 35 817 000", "description": "Tradicionalna bosanska kuhinja", "working_hours": "08:00 - 23:00"},
    {"name": "Restoran Zmaj", "category": "restaurant", "address": "Zmaja od Bosne 12", "latitude": 44.8785, "longitude": 18.4290, "phone": "+387 35 818 111", "description": "Roštilj i domaća jela", "working_hours": "10:00 - 23:00"},
    {"name": "Ćevabdžinica Kod Mehmeda", "category": "restaurant", "address": "Trg Husein-kapetana 5", "latitude": 44.8802, "longitude": 18.4268, "phone": "+387 35 817 222", "description": "Najbolji ćevapi u gradu", "working_hours": "08:00 - 22:00"},
    {"name": "Bingo", "category": "market", "address": "Željeznička bb", "latitude": 44.8770, "longitude": 18.4310, "phone": "+387 35 816 000", "description": "Supermarket", "working_hours": "07:00 - 22:00"},
    {"name": "Konzum", "category": "market", "address": "Titova 45", "latitude": 44.8792, "longitude": 18.4255, "phone": "+387 35 815 500", "description": "Prodavnica mješovite robe", "working_hours": "07:00 - 21:00"},
    {"name": "Robot", "category": "market", "address": "Alije Izetbegovića 18", "latitude": 44.8812, "longitude": 18.4240, "phone": "+387 35 814 333", "description": "Mali market", "working_hours": "06:00 - 22:00"},
    {"name": "Auto Servis Čamdžić", "category": "auto_service", "address": "Industrijska zona bb", "latitude": 44.8750, "longitude": 18.4350, "phone": "+387 35 820 100", "description": "Opravka svih vrsta vozila", "working_hours": "08:00 - 17:00"},
    {"name": "Vulkanizer Mehić", "category": "auto_service", "address": "Magistralni put bb", "latitude": 44.8730, "longitude": 18.4380, "phone": "+387 35 821 200", "description": "Gume i vulkanizacija", "working_hours": "07:00 - 19:00"},
    {"name": "Auto Perionica", "category": "auto_service", "address": "Orašje put 5", "latitude": 44.8820, "longitude": 18.4200, "phone": "+387 35 822 300", "description": "Pranje vozila", "working_hours": "08:00 - 20:00"},
    {"name": "Caffe Bar Central", "category": "cafe", "address": "Trg Husein-kapetana 1", "latitude": 44.8800, "longitude": 18.4270, "phone": "+387 35 817 444", "description": "Kafa i kolači", "working_hours": "07:00 - 24:00"},
    {"name": "Caffé di Milano", "category": "cafe", "address": "H.K. Gradaščevića 25", "latitude": 44.8795, "longitude": 18.4282, "phone": "+387 35 818 555", "description": "Espresso bar", "working_hours": "08:00 - 23:00"},
    {"name": "Slastičarna Ledo", "category": "cafe", "address": "Titova 30", "latitude": 44.8788, "longitude": 18.4260, "phone": "+387 35 819 666", "description": "Sladoled i kolači", "working_hours": "09:00 - 22:00"},
    {"name": "Apoteka Gradačac", "category": "pharmacy", "address": "Titova 10", "latitude": 44.8798, "longitude": 18.4265, "phone": "+387 35 815 111", "description": "Glavna gradska apoteka", "working_hours": "07:00 - 20:00"},
    {"name": "Apoteka Zdravlje", "category": "pharmacy", "address": "Alije Izetbegovića 5", "latitude": 44.8808, "longitude": 18.4250, "phone": "+387 35 816 222", "description": "Apoteka sa širokim asortimanom", "working_hours": "08:00 - 21:00"},
    {"name": "NIS Petrol", "category": "gas_station", "address": "Magistralni put bb", "latitude": 44.8720, "longitude": 18.4400, "phone": "+387 35 825 000", "description": "Benzinska pumpa", "working_hours": "00:00 - 24:00"},
    {"name": "Hifa Petrol", "category": "gas_station", "address": "Ulaz u grad bb", "latitude": 44.8850, "longitude": 18.4150, "phone": "+387 35 826 000", "description": "Benzinska i auto gas", "working_hours": "06:00 - 22:00"},
]

# ========== Startup ==========
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    # Seed admin
    existing = await db.users.find_one({"email": ADMIN_EMAIL})
    if not existing:
        await db.users.insert_one({
            "email": ADMIN_EMAIL,
            "password_hash": hash_password(ADMIN_PASSWORD),
            "name": "Admin",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logging.info(f"Admin seeded: {ADMIN_EMAIL}")
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one({"email": ADMIN_EMAIL}, {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}})
        logging.info("Admin password updated")
    # Seed locations
    count = await db.locations.count_documents({})
    if count == 0:
        for loc in SAMPLE_LOCATIONS:
            location = Location(**loc)
            await db.locations.insert_one(location.dict())
        logging.info(f"Seeded {len(SAMPLE_LOCATIONS)} locations")

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
    return {"message": "Gradačac City Map API", "version": "1.0"}

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    return [Category(**cat) for cat in CATEGORIES]

@api_router.get("/locations", response_model=List[Location])
async def get_locations(category: Optional[str] = Query(None)):
    query = {}
    if category:
        query["category"] = category
    locations = await db.locations.find(query, {"_id": 0}).to_list(1000)
    return [Location(**loc) for loc in locations]

@api_router.get("/locations/{location_id}", response_model=Location)
async def get_location(location_id: str):
    location = await db.locations.find_one({"id": location_id}, {"_id": 0})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return Location(**location)

@api_router.get("/search")
async def search_locations(q: str = Query(..., min_length=2)):
    locations = await db.locations.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"address": {"$regex": q, "$options": "i"}}
        ]
    }, {"_id": 0}).to_list(100)
    return [Location(**loc) for loc in locations]

# ========== Admin Routes (Protected) ==========
@api_router.post("/admin/locations", response_model=Location)
async def admin_create_location(input: LocationCreate, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    location = Location(**input.dict())
    await db.locations.insert_one(location.dict())
    return location

@api_router.put("/admin/locations/{location_id}", response_model=Location)
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
    return Location(**updated)

@api_router.delete("/admin/locations/{location_id}")
async def admin_delete_location(location_id: str, user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.locations.delete_one({"id": location_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Lokacija obrisana"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
