"""
Backend tests for Category CRUD operations
Tests: GET /api/categories, POST /api/admin/categories, PUT /api/admin/categories/{id}, DELETE /api/admin/categories/{id}
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

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment. Cannot run tests.")

@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def admin_token(api_client):
    """Get admin token for authenticated requests"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@gradacac.ba",
        "password": "Gradacac2024!"
    })
    if response.status_code != 200:
        pytest.skip(f"Admin login failed: {response.status_code}")
    return response.json()["token"]

class TestCategoriesPublic:
    """Public category endpoints (no auth required)"""

    def test_get_categories(self, api_client):
        """GET /api/categories returns list of categories"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        assert isinstance(categories, list)
        # Should have at least 6 default categories
        assert len(categories) >= 6
        
        # Verify structure of first category
        if len(categories) > 0:
            cat = categories[0]
            assert "id" in cat
            assert "name" in cat
            assert "icon" in cat
            assert "color" in cat
        
        print(f"✓ GET /api/categories returned {len(categories)} categories")

    def test_get_categories_has_defaults(self, api_client):
        """Verify default categories are present"""
        response = api_client.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200
        
        categories = response.json()
        category_ids = [cat["id"] for cat in categories]
        
        # Check for default categories
        default_ids = ["restaurant", "market", "auto_service", "cafe", "pharmacy", "gas_station"]
        for default_id in default_ids:
            assert default_id in category_ids, f"Default category '{default_id}' not found"
        
        print(f"✓ All 6 default categories present")

class TestCategoriesAdmin:
    """Admin category CRUD operations (require auth)"""

    def test_create_category_without_auth(self, api_client):
        """POST /api/admin/categories requires authentication"""
        response = api_client.post(f"{BASE_URL}/api/admin/categories", json={
            "name": "Test Category",
            "icon": "location",
            "color": "#888888"
        })
        assert response.status_code == 401
        print("✓ POST /api/admin/categories requires auth (401)")

    def test_create_category_with_auth(self, api_client, admin_token):
        """POST /api/admin/categories creates new category"""
        response = api_client.post(f"{BASE_URL}/api/admin/categories", json={
            "name": "TEST_Sportski Tereni",
            "icon": "football",
            "color": "#FF9800"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 200
        
        category = response.json()
        assert category["name"] == "TEST_Sportski Tereni"
        assert category["icon"] == "football"
        assert category["color"] == "#FF9800"
        assert "id" in category
        
        # Verify it was actually created by fetching all categories
        get_response = api_client.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        category_names = [cat["name"] for cat in categories]
        assert "TEST_Sportski Tereni" in category_names
        
        print(f"✓ POST /api/admin/categories created category with id: {category['id']}")
        return category["id"]

    def test_update_category_without_auth(self, api_client):
        """PUT /api/admin/categories/{id} requires authentication"""
        response = api_client.put(f"{BASE_URL}/api/admin/categories/restaurant", json={
            "name": "Updated Name"
        })
        assert response.status_code == 401
        print("✓ PUT /api/admin/categories/{id} requires auth (401)")

    def test_update_category_with_auth(self, api_client, admin_token):
        """PUT /api/admin/categories/{id} updates category"""
        # First create a test category
        create_response = api_client.post(f"{BASE_URL}/api/admin/categories", json={
            "name": "TEST_Update Category",
            "icon": "location",
            "color": "#888888"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert create_response.status_code == 200
        category_id = create_response.json()["id"]
        
        # Now update it
        update_response = api_client.put(f"{BASE_URL}/api/admin/categories/{category_id}", json={
            "name": "TEST_Updated Name",
            "color": "#FF0000"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["name"] == "TEST_Updated Name"
        assert updated["color"] == "#FF0000"
        assert updated["icon"] == "location"  # Should remain unchanged
        
        # Verify via GET
        get_response = api_client.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        updated_cat = next((cat for cat in categories if cat["id"] == category_id), None)
        assert updated_cat is not None
        assert updated_cat["name"] == "TEST_Updated Name"
        
        print(f"✓ PUT /api/admin/categories/{category_id} updated category successfully")

    def test_update_category_not_found(self, api_client, admin_token):
        """PUT /api/admin/categories/{id} returns 404 for non-existent category"""
        response = api_client.put(f"{BASE_URL}/api/admin/categories/nonexistent_id_12345", json={
            "name": "Updated Name"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 404
        print("✓ PUT /api/admin/categories/{id} returns 404 for non-existent category")

    def test_delete_category_without_auth(self, api_client):
        """DELETE /api/admin/categories/{id} requires authentication"""
        response = api_client.delete(f"{BASE_URL}/api/admin/categories/test_id")
        assert response.status_code == 401
        print("✓ DELETE /api/admin/categories/{id} requires auth (401)")

    def test_delete_category_with_auth(self, api_client, admin_token):
        """DELETE /api/admin/categories/{id} deletes category"""
        # First create a test category
        create_response = api_client.post(f"{BASE_URL}/api/admin/categories", json={
            "name": "TEST_Delete Category",
            "icon": "trash",
            "color": "#FF0000"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert create_response.status_code == 200
        category_id = create_response.json()["id"]
        
        # Now delete it
        delete_response = api_client.delete(f"{BASE_URL}/api/admin/categories/{category_id}",
                                           headers={"Authorization": f"Bearer {admin_token}"})
        
        assert delete_response.status_code == 200
        assert "message" in delete_response.json()
        
        # Verify it was deleted
        get_response = api_client.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        category_ids = [cat["id"] for cat in categories]
        assert category_id not in category_ids
        
        print(f"✓ DELETE /api/admin/categories/{category_id} deleted category successfully")

    def test_delete_category_in_use(self, api_client, admin_token):
        """DELETE /api/admin/categories/{id} blocks deletion if locations use it"""
        # Try to delete 'restaurant' category which has locations
        response = api_client.delete(f"{BASE_URL}/api/admin/categories/restaurant",
                                     headers={"Authorization": f"Bearer {admin_token}"})
        
        # Should return 400 with message about locations using it
        assert response.status_code == 400
        assert "lokacija" in response.json()["detail"].lower() or "location" in response.json()["detail"].lower()
        
        print("✓ DELETE /api/admin/categories/{id} blocks deletion when category is in use")

    def test_delete_category_not_found(self, api_client, admin_token):
        """DELETE /api/admin/categories/{id} returns 404 for non-existent category"""
        response = api_client.delete(f"{BASE_URL}/api/admin/categories/nonexistent_id_12345",
                                     headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 404
        print("✓ DELETE /api/admin/categories/{id} returns 404 for non-existent category")

class TestCategoryDataValidation:
    """Test category data validation"""

    def test_create_category_with_defaults(self, api_client, admin_token):
        """POST /api/admin/categories uses default icon and color if not provided"""
        response = api_client.post(f"{BASE_URL}/api/admin/categories", json={
            "name": "TEST_Minimal Category"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert response.status_code == 200
        
        category = response.json()
        assert category["name"] == "TEST_Minimal Category"
        assert category["icon"] == "location"  # Default icon
        assert category["color"] == "#888888"  # Default color
        
        print("✓ POST /api/admin/categories uses default icon and color")

    def test_update_category_partial(self, api_client, admin_token):
        """PUT /api/admin/categories/{id} allows partial updates"""
        # Create a test category
        create_response = api_client.post(f"{BASE_URL}/api/admin/categories", json={
            "name": "TEST_Partial Update",
            "icon": "star",
            "color": "#00FF00"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        category_id = create_response.json()["id"]
        
        # Update only the name
        update_response = api_client.put(f"{BASE_URL}/api/admin/categories/{category_id}", json={
            "name": "TEST_Partially Updated"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        
        assert update_response.status_code == 200
        
        updated = update_response.json()
        assert updated["name"] == "TEST_Partially Updated"
        assert updated["icon"] == "star"  # Should remain unchanged
        assert updated["color"] == "#00FF00"  # Should remain unchanged
        
        print("✓ PUT /api/admin/categories/{id} allows partial updates")
