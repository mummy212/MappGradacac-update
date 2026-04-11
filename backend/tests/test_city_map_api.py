"""
Backend API tests for City Map application
Tests: Categories, Locations, Search functionality
"""
import pytest
import requests
import os
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to get EXPO_PUBLIC_BACKEND_URL
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
if frontend_env.exists():
    load_dotenv(frontend_env)

# Use public URL for testing
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment. Cannot run tests.")

class TestHealthCheck:
    """Basic health check"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        try:
            response = requests.get(f"{BASE_URL}/api/", timeout=10)
            print(f"✓ API root status: {response.status_code}")
            assert response.status_code == 200
            data = response.json()
            assert "message" in data
            print(f"✓ API message: {data.get('message')}")
        except Exception as e:
            print(f"✗ API root failed: {str(e)}")
            raise


class TestCategories:
    """Category endpoint tests"""
    
    def test_get_categories_returns_6(self):
        """Test GET /api/categories returns exactly 6 categories"""
        try:
            response = requests.get(f"{BASE_URL}/api/categories", timeout=10)
            print(f"✓ Categories endpoint status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Categories count: {len(data)}")
            assert len(data) == 6, f"Expected 6 categories, got {len(data)}"
            
            # Verify structure
            for cat in data:
                assert "id" in cat
                assert "name" in cat
                assert "icon" in cat
                assert "color" in cat
                print(f"  - {cat['name']} ({cat['id']})")
            
            # Verify expected categories exist
            cat_ids = [c['id'] for c in data]
            expected = ['restaurant', 'market', 'auto_service', 'cafe', 'pharmacy', 'gas_station']
            for exp in expected:
                assert exp in cat_ids, f"Missing category: {exp}"
            print(f"✓ All expected categories present")
            
        except Exception as e:
            print(f"✗ Categories test failed: {str(e)}")
            raise


class TestLocations:
    """Location endpoint tests"""
    
    def test_get_all_locations_returns_16(self):
        """Test GET /api/locations returns exactly 16 seeded locations"""
        try:
            response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            print(f"✓ Locations endpoint status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Locations count: {len(data)}")
            assert len(data) == 16, f"Expected 16 locations, got {len(data)}"
            
            # Verify structure of first location
            if data:
                loc = data[0]
                required_fields = ['id', 'name', 'category', 'address', 'latitude', 'longitude']
                for field in required_fields:
                    assert field in loc, f"Missing field: {field}"
                
                # Check for MongoDB _id (should NOT be present)
                if '_id' in loc:
                    print(f"⚠ WARNING: MongoDB _id found in response - should be excluded")
                
                print(f"✓ Location structure valid")
                print(f"  Sample: {loc['name']} - {loc['category']}")
            
        except Exception as e:
            print(f"✗ Locations test failed: {str(e)}")
            raise
    
    def test_filter_by_category_restaurant(self):
        """Test GET /api/locations?category=restaurant returns only restaurants"""
        try:
            response = requests.get(f"{BASE_URL}/api/locations?category=restaurant", timeout=10)
            print(f"✓ Filter by restaurant status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Restaurant locations count: {len(data)}")
            assert len(data) > 0, "Expected at least 1 restaurant"
            
            # Verify all are restaurants
            for loc in data:
                assert loc['category'] == 'restaurant', f"Expected restaurant, got {loc['category']}"
                print(f"  - {loc['name']}")
            
            print(f"✓ All filtered locations are restaurants")
            
        except Exception as e:
            print(f"✗ Category filter test failed: {str(e)}")
            raise
    
    def test_filter_by_category_market(self):
        """Test GET /api/locations?category=market returns only markets"""
        try:
            response = requests.get(f"{BASE_URL}/api/locations?category=market", timeout=10)
            print(f"✓ Filter by market status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Market locations count: {len(data)}")
            assert len(data) > 0, "Expected at least 1 market"
            
            # Verify all are markets
            for loc in data:
                assert loc['category'] == 'market', f"Expected market, got {loc['category']}"
            
            print(f"✓ All filtered locations are markets")
            
        except Exception as e:
            print(f"✗ Market filter test failed: {str(e)}")
            raise


class TestSearch:
    """Search endpoint tests"""
    
    def test_search_bingo_returns_match(self):
        """Test GET /api/search?q=Bingo returns Bingo market"""
        try:
            response = requests.get(f"{BASE_URL}/api/search?q=Bingo", timeout=10)
            print(f"✓ Search endpoint status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Search results count: {len(data)}")
            assert len(data) > 0, "Expected at least 1 result for 'Bingo'"
            
            # Verify Bingo is in results
            names = [loc['name'] for loc in data]
            assert any('Bingo' in name for name in names), "Bingo not found in search results"
            
            for loc in data:
                print(f"  - {loc['name']} ({loc['category']})")
            
            print(f"✓ Search for 'Bingo' successful")
            
        except Exception as e:
            print(f"✗ Search test failed: {str(e)}")
            raise
    
    def test_search_case_insensitive(self):
        """Test search is case insensitive"""
        try:
            response = requests.get(f"{BASE_URL}/api/search?q=bingo", timeout=10)
            print(f"✓ Case insensitive search status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert len(data) > 0, "Expected results for lowercase 'bingo'"
            print(f"✓ Case insensitive search works")
            
        except Exception as e:
            print(f"✗ Case insensitive search failed: {str(e)}")
            raise
    
    def test_search_by_address(self):
        """Test search works for addresses"""
        try:
            response = requests.get(f"{BASE_URL}/api/search?q=Titova", timeout=10)
            print(f"✓ Address search status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Address search results: {len(data)}")
            assert len(data) > 0, "Expected results for address 'Titova'"
            
            # Verify results contain Titova in address
            for loc in data:
                assert 'Titova' in loc['address'], f"Expected 'Titova' in address, got {loc['address']}"
                print(f"  - {loc['name']} at {loc['address']}")
            
            print(f"✓ Address search successful")
            
        except Exception as e:
            print(f"✗ Address search failed: {str(e)}")
            raise


class TestDataPersistence:
    """Test data persistence and CRUD operations"""
    
    def test_create_and_get_location(self):
        """Test creating a location and verifying it persists"""
        try:
            # Create test location
            test_location = {
                "name": "TEST_Location",
                "category": "cafe",
                "address": "Test Address 123",
                "latitude": 44.8800,
                "longitude": 18.4270,
                "phone": "+387 35 999 999",
                "description": "Test location",
                "working_hours": "09:00 - 17:00"
            }
            
            create_response = requests.post(f"{BASE_URL}/api/locations", json=test_location, timeout=10)
            print(f"✓ Create location status: {create_response.status_code}")
            assert create_response.status_code == 200
            
            created = create_response.json()
            assert "id" in created
            location_id = created["id"]
            print(f"✓ Created location with ID: {location_id}")
            
            # GET to verify persistence
            get_response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            print(f"✓ Get location status: {get_response.status_code}")
            assert get_response.status_code == 200
            
            retrieved = get_response.json()
            assert retrieved["name"] == test_location["name"]
            assert retrieved["category"] == test_location["category"]
            print(f"✓ Location persisted correctly")
            
            # Cleanup - delete test location
            delete_response = requests.delete(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            print(f"✓ Cleanup: deleted test location (status: {delete_response.status_code})")
            
        except Exception as e:
            print(f"✗ Create and get test failed: {str(e)}")
            raise
    
    def test_delete_location(self):
        """Test deleting a location"""
        try:
            # Create test location first
            test_location = {
                "name": "TEST_DeleteMe",
                "category": "cafe",
                "address": "Delete Test 456",
                "latitude": 44.8800,
                "longitude": 18.4270
            }
            
            create_response = requests.post(f"{BASE_URL}/api/locations", json=test_location, timeout=10)
            assert create_response.status_code == 200
            location_id = create_response.json()["id"]
            print(f"✓ Created test location for deletion: {location_id}")
            
            # Delete it
            delete_response = requests.delete(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            print(f"✓ Delete status: {delete_response.status_code}")
            assert delete_response.status_code == 200
            
            # Verify it's gone
            get_response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            print(f"✓ Get deleted location status: {get_response.status_code}")
            assert get_response.status_code == 404, "Expected 404 for deleted location"
            
            print(f"✓ Location successfully deleted and verified")
            
        except Exception as e:
            print(f"✗ Delete test failed: {str(e)}")
            raise


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
