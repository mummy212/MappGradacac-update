"""
Backend API tests for new features in major update
Tests: is_open field, distance sorting, offers, events, analytics, business accounts, business offers/menu
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

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@gradacac.ba"
ADMIN_PASSWORD = "Gradacac2024!"


@pytest.fixture
def admin_token():
    """Get admin auth token"""
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        }, timeout=10)
        assert response.status_code == 200, f"Admin login failed: {response.status_code}"
        data = response.json()
        assert "token" in data, "No token in login response"
        print(f"✓ Admin login successful")
        return data["token"]
    except Exception as e:
        print(f"✗ Admin login failed: {str(e)}")
        raise


class TestIsOpenField:
    """Test is_open field in location responses"""
    
    def test_locations_have_is_open_field(self):
        """Test GET /api/locations returns is_open field for all locations"""
        try:
            response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            print(f"✓ GET /api/locations status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert len(data) > 0, "Expected at least 1 location"
            
            # Check all locations have is_open field
            for loc in data:
                assert "is_open" in loc, f"Location {loc.get('name')} missing is_open field"
                assert isinstance(loc["is_open"], bool), f"is_open should be boolean, got {type(loc['is_open'])}"
            
            print(f"✓ All {len(data)} locations have is_open field (boolean)")
            
            # Show sample
            sample = data[0]
            print(f"  Sample: {sample['name']} - is_open: {sample['is_open']}")
            
        except Exception as e:
            print(f"✗ is_open field test failed: {str(e)}")
            raise
    
    def test_single_location_has_is_open(self):
        """Test GET /api/locations/{id} returns is_open field"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/locations/{loc_id}", timeout=10)
            print(f"✓ GET /api/locations/{loc_id} status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert "is_open" in data, "Single location missing is_open field"
            assert isinstance(data["is_open"], bool)
            
            print(f"✓ Single location has is_open: {data['is_open']}")
            
        except Exception as e:
            print(f"✗ Single location is_open test failed: {str(e)}")
            raise


class TestDistanceSorting:
    """Test distance sorting functionality"""
    
    def test_distance_sorting_with_coords(self):
        """Test GET /api/locations?lat=44.88&lng=18.43&sort=distance returns sorted by distance"""
        try:
            lat, lng = 44.88, 18.43
            response = requests.get(f"{BASE_URL}/api/locations?lat={lat}&lng={lng}&sort=distance", timeout=10)
            print(f"✓ GET /api/locations with distance sort status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert len(data) > 0, "Expected at least 1 location"
            
            # Check all locations have distance field
            for loc in data:
                assert "distance" in loc, f"Location {loc.get('name')} missing distance field"
                assert isinstance(loc["distance"], (int, float)), f"distance should be number, got {type(loc['distance'])}"
            
            print(f"✓ All {len(data)} locations have distance field")
            
            # Verify sorted by distance (ascending)
            distances = [loc["distance"] for loc in data]
            assert distances == sorted(distances), "Locations not sorted by distance"
            
            print(f"✓ Locations sorted by distance (ascending)")
            print(f"  Closest: {data[0]['name']} - {data[0]['distance']}m")
            print(f"  Farthest: {data[-1]['name']} - {data[-1]['distance']}m")
            
        except Exception as e:
            print(f"✗ Distance sorting test failed: {str(e)}")
            raise
    
    def test_distance_without_sort_param(self):
        """Test that distance is NOT calculated without sort=distance param"""
        try:
            lat, lng = 44.88, 18.43
            response = requests.get(f"{BASE_URL}/api/locations?lat={lat}&lng={lng}", timeout=10)
            print(f"✓ GET /api/locations with coords (no sort) status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            
            # Distance field should NOT be present without sort=distance
            for loc in data:
                assert "distance" not in loc, "Distance field should only be present with sort=distance"
            
            print(f"✓ Distance field NOT present without sort=distance (correct behavior)")
            
        except Exception as e:
            print(f"✗ Distance without sort test failed: {str(e)}")
            raise


class TestOffers:
    """Test offers endpoints"""
    
    def test_get_all_offers(self):
        """Test GET /api/offers returns offers with location_name enriched"""
        try:
            response = requests.get(f"{BASE_URL}/api/offers", timeout=10)
            print(f"✓ GET /api/offers status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Offers count: {len(data)}")
            
            if len(data) > 0:
                # Check structure
                offer = data[0]
                required_fields = ["id", "location_id", "title", "description", "is_active"]
                for field in required_fields:
                    assert field in offer, f"Offer missing field: {field}"
                
                # Check enrichment
                assert "location_name" in offer, "Offer missing location_name enrichment"
                print(f"✓ Offers have location_name enrichment")
                print(f"  Sample: {offer['title']} - {offer['location_name']}")
            else:
                print(f"⚠ No offers in database (this is OK if none created yet)")
            
        except Exception as e:
            print(f"✗ Get offers test failed: {str(e)}")
            raise
    
    def test_get_location_offers(self):
        """Test GET /api/locations/{id}/offers returns offers for specific location"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/locations/{loc_id}/offers", timeout=10)
            print(f"✓ GET /api/locations/{loc_id}/offers status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Location offers count: {len(data)}")
            
            # Verify all offers belong to this location
            for offer in data:
                assert offer["location_id"] == loc_id, "Offer doesn't belong to this location"
            
            print(f"✓ All offers belong to location {loc_id}")
            
        except Exception as e:
            print(f"✗ Get location offers test failed: {str(e)}")
            raise


class TestEvents:
    """Test events endpoints"""
    
    def test_get_events(self):
        """Test GET /api/events returns upcoming events"""
        try:
            response = requests.get(f"{BASE_URL}/api/events", timeout=10)
            print(f"✓ GET /api/events status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Events count: {len(data)}")
            
            if len(data) > 0:
                # Check structure
                event = data[0]
                required_fields = ["id", "title", "description", "location_name", "date"]
                for field in required_fields:
                    assert field in event, f"Event missing field: {field}"
                
                print(f"✓ Events have required fields")
                print(f"  Sample: {event['title']} at {event['location_name']} on {event['date']}")
            else:
                print(f"⚠ No events in database (this is OK if none created yet)")
            
        except Exception as e:
            print(f"✗ Get events test failed: {str(e)}")
            raise


class TestAnalytics:
    """Test analytics tracking endpoints"""
    
    def test_track_nav_clicks(self):
        """Test POST /api/locations/{id}/track/nav_clicks tracks analytics"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            response = requests.post(f"{BASE_URL}/api/locations/{loc_id}/track/nav_clicks", timeout=10)
            print(f"✓ POST /api/locations/{loc_id}/track/nav_clicks status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert "ok" in data or data.get("ok") == True, "Expected {ok: true} response"
            
            print(f"✓ Analytics tracking successful")
            
        except Exception as e:
            print(f"✗ Track nav_clicks test failed: {str(e)}")
            raise
    
    def test_track_call_clicks(self):
        """Test POST /api/locations/{id}/track/call_clicks tracks analytics"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            response = requests.post(f"{BASE_URL}/api/locations/{loc_id}/track/call_clicks", timeout=10)
            print(f"✓ POST /api/locations/{loc_id}/track/call_clicks status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert "ok" in data or data.get("ok") == True
            
            print(f"✓ Call clicks tracking successful")
            
        except Exception as e:
            print(f"✗ Track call_clicks test failed: {str(e)}")
            raise
    
    def test_track_invalid_action(self):
        """Test tracking with invalid action returns 400"""
        try:
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            response = requests.post(f"{BASE_URL}/api/locations/{loc_id}/track/invalid_action", timeout=10)
            print(f"✓ POST /api/locations/{loc_id}/track/invalid_action status: {response.status_code}")
            assert response.status_code == 400, "Expected 400 for invalid action"
            
            print(f"✓ Invalid action rejected with 400")
            
        except Exception as e:
            print(f"✗ Invalid action test failed: {str(e)}")
            raise


class TestBusinessAccounts:
    """Test business account creation (admin only)"""
    
    def test_create_business_account_without_auth(self):
        """Test POST /api/admin/business-accounts requires auth"""
        try:
            payload = {
                "email": "test_business@example.com",
                "password": "TestPass123",
                "name": "Test Business",
                "location_id": "dummy-id"
            }
            
            response = requests.post(f"{BASE_URL}/api/admin/business-accounts", json=payload, timeout=10)
            print(f"✓ POST /api/admin/business-accounts (no auth) status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            
            print(f"✓ Business account creation requires auth")
            
        except Exception as e:
            print(f"✗ Business account no-auth test failed: {str(e)}")
            raise
    
    def test_create_business_account_with_auth(self, admin_token):
        """Test POST /api/admin/business-accounts creates business account"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            payload = {
                "email": f"test_business_{loc_id[:8]}@example.com",
                "password": "TestPass123",
                "name": "TEST Business Account",
                "location_id": loc_id
            }
            
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.post(f"{BASE_URL}/api/admin/business-accounts", json=payload, headers=headers, timeout=10)
            print(f"✓ POST /api/admin/business-accounts (with auth) status: {response.status_code}")
            
            # Accept both 200 and 400 (400 if email already exists from previous test)
            if response.status_code == 400:
                data = response.json()
                if "već postoji" in data.get("detail", "").lower() or "already exists" in data.get("detail", "").lower():
                    print(f"✓ Business account already exists (from previous test)")
                else:
                    raise AssertionError(f"Unexpected 400 error: {data}")
            else:
                assert response.status_code == 200, f"Expected 200, got {response.status_code}"
                data = response.json()
                assert "message" in data
                print(f"✓ Business account created: {data['message']}")
            
        except Exception as e:
            print(f"✗ Create business account test failed: {str(e)}")
            raise


class TestBusinessOffers:
    """Test business offer creation (business/admin auth)"""
    
    def test_create_business_offer_without_auth(self):
        """Test POST /api/business/offers requires auth"""
        try:
            payload = {
                "location_id": "dummy-id",
                "title": "Test Offer",
                "description": "Test description",
                "discount_percent": 20
            }
            
            response = requests.post(f"{BASE_URL}/api/business/offers", json=payload, timeout=10)
            print(f"✓ POST /api/business/offers (no auth) status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            
            print(f"✓ Business offer creation requires auth")
            
        except Exception as e:
            print(f"✗ Business offer no-auth test failed: {str(e)}")
            raise
    
    def test_create_business_offer_with_admin_auth(self, admin_token):
        """Test POST /api/business/offers creates offer with admin auth"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            payload = {
                "location_id": loc_id,
                "title": "TEST Admin Offer",
                "description": "Test offer created by admin",
                "discount_percent": 15
            }
            
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.post(f"{BASE_URL}/api/business/offers", json=payload, headers=headers, timeout=10)
            print(f"✓ POST /api/business/offers (admin auth) status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert data["title"] == payload["title"]
            assert data["location_id"] == loc_id
            assert "id" in data
            
            print(f"✓ Business offer created by admin: {data['id']}")
            
        except Exception as e:
            print(f"✗ Create business offer test failed: {str(e)}")
            raise


class TestBusinessMenu:
    """Test business menu item creation (business/admin auth)"""
    
    def test_create_menu_item_without_auth(self):
        """Test POST /api/business/menu requires auth"""
        try:
            payload = {
                "name": "Test Item",
                "price": 10.50,
                "description": "Test menu item"
            }
            
            response = requests.post(f"{BASE_URL}/api/business/menu?lid=dummy-id", json=payload, timeout=10)
            print(f"✓ POST /api/business/menu (no auth) status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            
            print(f"✓ Menu item creation requires auth")
            
        except Exception as e:
            print(f"✗ Menu item no-auth test failed: {str(e)}")
            raise
    
    def test_create_menu_item_with_admin_auth(self, admin_token):
        """Test POST /api/business/menu creates menu item with admin auth"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            payload = {
                "name": "TEST Ćevapi",
                "price": 8.50,
                "description": "10 komada sa lukom",
                "category": "Glavna jela"
            }
            
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.post(f"{BASE_URL}/api/business/menu?lid={loc_id}", json=payload, headers=headers, timeout=10)
            print(f"✓ POST /api/business/menu (admin auth) status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert data["name"] == payload["name"]
            assert data["price"] == payload["price"]
            assert data["location_id"] == loc_id
            assert "id" in data
            
            print(f"✓ Menu item created by admin: {data['name']} - {data['price']} KM")
            
        except Exception as e:
            print(f"✗ Create menu item test failed: {str(e)}")
            raise
    
    def test_get_location_menu(self):
        """Test GET /api/locations/{id}/menu returns menu items"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/locations/{loc_id}/menu", timeout=10)
            print(f"✓ GET /api/locations/{loc_id}/menu status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Menu items count: {len(data)}")
            
            if len(data) > 0:
                item = data[0]
                assert "name" in item
                assert "price" in item
                assert "location_id" in item
                print(f"  Sample: {item['name']} - {item['price']} KM")
            
        except Exception as e:
            print(f"✗ Get location menu test failed: {str(e)}")
            raise
