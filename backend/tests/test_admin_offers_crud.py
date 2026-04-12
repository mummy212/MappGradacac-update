"""
Backend tests for Offers CRUD endpoints
Tests: GET /api/offers, POST /api/business/offers, DELETE /api/business/offers/{id}
"""
import pytest
import requests
import os

# Get backend URL from frontend .env
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent.parent / 'frontend' / '.env'
load_dotenv(env_path)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")

ADMIN_EMAIL = "admin@gradacac.ba"
ADMIN_PASSWORD = "Gradacac2024!"

@pytest.fixture
def admin_token():
    """Login as admin and return token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    assert "token" in data, "No token in login response"
    return data["token"]

@pytest.fixture
def test_location_id():
    """Get a location ID for testing"""
    response = requests.get(f"{BASE_URL}/api/locations")
    assert response.status_code == 200
    locations = response.json()
    assert len(locations) > 0, "No locations available for testing"
    return locations[0]["id"]

class TestOffersAuth:
    """Test authentication requirements for offers endpoints"""
    
    def test_create_offer_without_auth_fails(self, test_location_id):
        """POST /api/business/offers without auth should return 401"""
        response = requests.post(f"{BASE_URL}/api/business/offers", json={
            "location_id": test_location_id,
            "title": "Test Offer",
            "description": "Test Description",
            "discount_percent": 20
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/business/offers without auth returns 401")
    
    def test_delete_offer_without_auth_fails(self):
        """DELETE /api/business/offers/{id} without auth should return 401"""
        response = requests.delete(f"{BASE_URL}/api/business/offers/fake-id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ DELETE /api/business/offers/{id} without auth returns 401")

class TestOffersCRUD:
    """Test offers CRUD operations"""
    
    def test_create_offer_and_verify_persistence(self, admin_token, test_location_id):
        """POST creates offer, GET /api/offers shows it with correct data"""
        # Create offer
        create_payload = {
            "location_id": test_location_id,
            "title": "TEST Playwright Offer",
            "description": "20% popust na sve proizvode",
            "discount_percent": 20,
            "expires_at": "2026-12-31"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/business/offers",
            json=create_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        created_offer = create_response.json()
        assert created_offer["title"] == create_payload["title"]
        assert created_offer["description"] == create_payload["description"]
        assert created_offer["discount_percent"] == create_payload["discount_percent"]
        assert created_offer["location_id"] == test_location_id
        assert "id" in created_offer
        offer_id = created_offer["id"]
        print(f"✓ POST /api/business/offers created offer with ID: {offer_id}")
        
        # GET to verify persistence
        get_response = requests.get(f"{BASE_URL}/api/offers?active_only=false")
        assert get_response.status_code == 200
        all_offers = get_response.json()
        
        # Find our test offer
        test_offer = next((o for o in all_offers if o["id"] == offer_id), None)
        assert test_offer is not None, f"Created offer {offer_id} not found in GET /api/offers"
        assert test_offer["title"] == create_payload["title"]
        assert test_offer["description"] == create_payload["description"]
        assert test_offer["discount_percent"] == create_payload["discount_percent"]
        print(f"✓ GET /api/offers?active_only=false returns created offer with correct data")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/business/offers/{offer_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_delete_offer_removes_from_list(self, admin_token, test_location_id):
        """DELETE removes offer, GET /api/offers confirms deletion"""
        # Create offer
        create_payload = {
            "location_id": test_location_id,
            "title": "TEST Delete Offer",
            "description": "This will be deleted",
            "discount_percent": 15
        }
        create_response = requests.post(
            f"{BASE_URL}/api/business/offers",
            json=create_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        offer_id = create_response.json()["id"]
        print(f"✓ Created test offer {offer_id} for deletion test")
        
        # Delete offer
        delete_response = requests.delete(
            f"{BASE_URL}/api/business/offers/{offer_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"✓ DELETE /api/business/offers/{offer_id} returned 200")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/offers?active_only=false")
        assert get_response.status_code == 200
        all_offers = get_response.json()
        
        deleted_offer = next((o for o in all_offers if o["id"] == offer_id), None)
        assert deleted_offer is None, f"Deleted offer {offer_id} still appears in GET /api/offers"
        print(f"✓ GET /api/offers confirms offer {offer_id} was deleted")
    
    def test_get_offers_active_only_filter(self, admin_token, test_location_id):
        """GET /api/offers?active_only=true returns only active offers"""
        # Create active offer
        active_payload = {
            "location_id": test_location_id,
            "title": "TEST Active Offer",
            "description": "Active offer",
            "discount_percent": 10
        }
        active_response = requests.post(
            f"{BASE_URL}/api/business/offers",
            json=active_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert active_response.status_code == 200
        active_id = active_response.json()["id"]
        
        # Get active offers
        active_get = requests.get(f"{BASE_URL}/api/offers?active_only=true")
        assert active_get.status_code == 200
        active_offers = active_get.json()
        
        # Verify active offer is in list
        found = next((o for o in active_offers if o["id"] == active_id), None)
        assert found is not None, "Active offer not found in active_only=true response"
        print(f"✓ GET /api/offers?active_only=true returns active offers")
        
        # Get all offers
        all_get = requests.get(f"{BASE_URL}/api/offers?active_only=false")
        assert all_get.status_code == 200
        all_offers = all_get.json()
        
        # Verify active offer is also in all offers
        found_all = next((o for o in all_offers if o["id"] == active_id), None)
        assert found_all is not None, "Active offer not found in active_only=false response"
        print(f"✓ GET /api/offers?active_only=false returns all offers including active")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/business/offers/{active_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_offer_structure_validation(self, admin_token, test_location_id):
        """Offer response has all required fields"""
        create_payload = {
            "location_id": test_location_id,
            "title": "TEST Structure Validation",
            "description": "Testing structure",
            "discount_percent": 25,
            "expires_at": "2026-06-30"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/business/offers",
            json=create_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        offer = create_response.json()
        
        # Verify required fields
        required_fields = ["id", "location_id", "title", "description", "is_active", "created_at"]
        for field in required_fields:
            assert field in offer, f"Missing required field: {field}"
        
        # Verify optional fields
        assert "discount_percent" in offer
        assert offer["discount_percent"] == 25
        assert "expires_at" in offer
        assert offer["expires_at"] == "2026-06-30"
        
        print(f"✓ Offer response has all required fields: {', '.join(required_fields)}")
        print(f"✓ Optional fields present: discount_percent, expires_at")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/business/offers/{offer['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
    
    def test_create_offer_without_discount_optional(self, admin_token, test_location_id):
        """POST works without discount_percent field (optional)"""
        create_payload = {
            "location_id": test_location_id,
            "title": "TEST No Discount",
            "description": "Offer without discount percentage"
        }
        create_response = requests.post(
            f"{BASE_URL}/api/business/offers",
            json=create_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        offer = create_response.json()
        assert offer["title"] == create_payload["title"]
        assert offer["description"] == create_payload["description"]
        # discount_percent should be None or not present
        print(f"✓ POST /api/business/offers works without discount_percent (optional field)")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/business/offers/{offer['id']}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

class TestOffersPublicEndpoint:
    """Test public offers endpoint"""
    
    def test_get_offers_public_access(self):
        """GET /api/offers is public (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/offers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        offers = response.json()
        assert isinstance(offers, list), "Response should be a list"
        print(f"✓ GET /api/offers is public (no auth required), returned {len(offers)} offers")
    
    def test_offers_enriched_with_location_data(self, admin_token, test_location_id):
        """Offers are enriched with location_name and location_image"""
        # Create offer
        create_payload = {
            "location_id": test_location_id,
            "title": "TEST Enrichment",
            "description": "Testing location data enrichment",
            "discount_percent": 30
        }
        create_response = requests.post(
            f"{BASE_URL}/api/business/offers",
            json=create_payload,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        offer_id = create_response.json()["id"]
        
        # Get offers
        get_response = requests.get(f"{BASE_URL}/api/offers")
        assert get_response.status_code == 200
        offers = get_response.json()
        
        # Find our test offer
        test_offer = next((o for o in offers if o["id"] == offer_id), None)
        assert test_offer is not None
        
        # Verify enrichment
        assert "location_name" in test_offer, "Missing location_name enrichment"
        assert test_offer["location_name"] != "", "location_name should not be empty"
        assert "location_image" in test_offer, "Missing location_image enrichment"
        
        print(f"✓ Offers enriched with location_name: '{test_offer['location_name']}'")
        print(f"✓ Offers enriched with location_image field")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/business/offers/{offer_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
