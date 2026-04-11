from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Define Models
class Location(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    category: str  # restaurant, market, auto_service, cafe, pharmacy, gas_station
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    description: Optional[str] = None
    working_hours: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LocationCreate(BaseModel):
    name: str
    category: str
    address: str
    latitude: float
    longitude: float
    phone: Optional[str] = None
    description: Optional[str] = None
    working_hours: Optional[str] = None

class Category(BaseModel):
    id: str
    name: str
    icon: str
    color: str

# Predefined categories
CATEGORIES = [
    {"id": "restaurant", "name": "Restorani", "icon": "restaurant", "color": "#FF6B6B"},
    {"id": "market", "name": "Marketi", "icon": "cart", "color": "#4ECDC4"},
    {"id": "auto_service", "name": "Auto Servisi", "icon": "car", "color": "#45B7D1"},
    {"id": "cafe", "name": "Kafići", "icon": "cafe", "color": "#96CEB4"},
    {"id": "pharmacy", "name": "Ljekarne", "icon": "medkit", "color": "#FFEAA7"},
    {"id": "gas_station", "name": "Benzinske", "icon": "water", "color": "#DDA0DD"},
]

# Sample data for Gradačac
SAMPLE_LOCATIONS = [
    # Restorani
    {"name": "Restoran Stari Grad", "category": "restaurant", "address": "Husein-kapetana Gradaščevića bb", "latitude": 44.8797, "longitude": 18.4275, "phone": "+387 35 817 000", "description": "Tradicionalna bosanska kuhinja", "working_hours": "08:00 - 23:00"},
    {"name": "Restoran Zmaj", "category": "restaurant", "address": "Zmaja od Bosne 12", "latitude": 44.8785, "longitude": 18.4290, "phone": "+387 35 818 111", "description": "Roštilj i domaća jela", "working_hours": "10:00 - 23:00"},
    {"name": "Ćevabdžinica Kod Mehmeda", "category": "restaurant", "address": "Trg Husein-kapetana 5", "latitude": 44.8802, "longitude": 18.4268, "phone": "+387 35 817 222", "description": "Najbolji ćevapi u gradu", "working_hours": "08:00 - 22:00"},
    
    # Marketi
    {"name": "Bingo", "category": "market", "address": "Željeznička bb", "latitude": 44.8770, "longitude": 18.4310, "phone": "+387 35 816 000", "description": "Supermarket", "working_hours": "07:00 - 22:00"},
    {"name": "Konzum", "category": "market", "address": "Titova 45", "latitude": 44.8792, "longitude": 18.4255, "phone": "+387 35 815 500", "description": "Prodavnica mješovite robe", "working_hours": "07:00 - 21:00"},
    {"name": "Robot", "category": "market", "address": "Alije Izetbegovića 18", "latitude": 44.8812, "longitude": 18.4240, "phone": "+387 35 814 333", "description": "Mali market", "working_hours": "06:00 - 22:00"},
    
    # Auto servisi
    {"name": "Auto Servis Čamdžić", "category": "auto_service", "address": "Industrijska zona bb", "latitude": 44.8750, "longitude": 18.4350, "phone": "+387 35 820 100", "description": "Opravka svih vrsta vozila", "working_hours": "08:00 - 17:00"},
    {"name": "Vulkanizer Mehić", "category": "auto_service", "address": "Magistralni put bb", "latitude": 44.8730, "longitude": 18.4380, "phone": "+387 35 821 200", "description": "Gume i vulkanizacija", "working_hours": "07:00 - 19:00"},
    {"name": "Auto Perionica", "category": "auto_service", "address": "Orašje put 5", "latitude": 44.8820, "longitude": 18.4200, "phone": "+387 35 822 300", "description": "Pranje vozila", "working_hours": "08:00 - 20:00"},
    
    # Kafići
    {"name": "Caffe Bar Central", "category": "cafe", "address": "Trg Husein-kapetana 1", "latitude": 44.8800, "longitude": 18.4270, "phone": "+387 35 817 444", "description": "Kafa i kolači", "working_hours": "07:00 - 24:00"},
    {"name": "Caffé di Milano", "category": "cafe", "address": "H.K. Gradaščevića 25", "latitude": 44.8795, "longitude": 18.4282, "phone": "+387 35 818 555", "description": "Espresso bar", "working_hours": "08:00 - 23:00"},
    {"name": "Slastičarna Ledo", "category": "cafe", "address": "Titova 30", "latitude": 44.8788, "longitude": 18.4260, "phone": "+387 35 819 666", "description": "Sladoled i kolači", "working_hours": "09:00 - 22:00"},
    
    # Ljekarne
    {"name": "Apoteka Gradačac", "category": "pharmacy", "address": "Titova 10", "latitude": 44.8798, "longitude": 18.4265, "phone": "+387 35 815 111", "description": "Glavna gradska apoteka", "working_hours": "07:00 - 20:00"},
    {"name": "Apoteka Zdravlje", "category": "pharmacy", "address": "Alije Izetbegovića 5", "latitude": 44.8808, "longitude": 18.4250, "phone": "+387 35 816 222", "description": "Apoteka sa širokim asortimanom", "working_hours": "08:00 - 21:00"},
    
    # Benzinske
    {"name": "NIS Petrol", "category": "gas_station", "address": "Magistralni put bb", "latitude": 44.8720, "longitude": 18.4400, "phone": "+387 35 825 000", "description": "Benzinska pumpa", "working_hours": "00:00 - 24:00"},
    {"name": "Hifa Petrol", "category": "gas_station", "address": "Ulaz u grad bb", "latitude": 44.8850, "longitude": 18.4150, "phone": "+387 35 826 000", "description": "Benzinska i auto gas", "working_hours": "06:00 - 22:00"},
]

# Seed database on startup
@app.on_event("startup")
async def seed_database():
    # Check if locations exist
    count = await db.locations.count_documents({})
    if count == 0:
        # Insert sample data
        for loc in SAMPLE_LOCATIONS:
            location = Location(**loc)
            await db.locations.insert_one(location.dict())
        logging.info(f"Seeded {len(SAMPLE_LOCATIONS)} locations")
    else:
        logging.info(f"Database already has {count} locations")

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Gradačac City Map API", "version": "1.0"}

@api_router.get("/categories", response_model=List[Category])
async def get_categories():
    """Get all location categories"""
    return [Category(**cat) for cat in CATEGORIES]

@api_router.get("/locations", response_model=List[Location])
async def get_locations(category: Optional[str] = Query(None)):
    """Get all locations, optionally filtered by category"""
    query = {}
    if category:
        query["category"] = category
    locations = await db.locations.find(query).to_list(1000)
    return [Location(**loc) for loc in locations]

@api_router.get("/locations/{location_id}", response_model=Location)
async def get_location(location_id: str):
    """Get a specific location by ID"""
    location = await db.locations.find_one({"id": location_id})
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return Location(**location)

@api_router.post("/locations", response_model=Location)
async def create_location(input: LocationCreate):
    """Create a new location"""
    location = Location(**input.dict())
    await db.locations.insert_one(location.dict())
    return location

@api_router.delete("/locations/{location_id}")
async def delete_location(location_id: str):
    """Delete a location"""
    result = await db.locations.delete_one({"id": location_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "Location deleted"}

@api_router.get("/search")
async def search_locations(q: str = Query(..., min_length=2)):
    """Search locations by name or address"""
    locations = await db.locations.find({
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"address": {"$regex": q, "$options": "i"}}
        ]
    }).to_list(100)
    return [Location(**loc) for loc in locations]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
