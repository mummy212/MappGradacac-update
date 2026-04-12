"""
Backend tests for Admin Tourism CRUD:
- POST /api/admin/tourism/attractions (create)
- PUT /api/admin/tourism/attractions/{id} (update)
- DELETE /api/admin/tourism/attractions/{id} (delete)
- Auth requirement verification
"""
import pytest
import requests
import os

# Get backend URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BASE_URL:
    import subprocess
    result = subprocess.run(['cat', '/app/frontend/.env'], capture_output=True, text=True)
    for line in result.stdout.split('\n'):
        if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
            BASE_URL = line.split('=')[1].strip()
            break
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")
BASE_URL = BASE_URL.rstrip('/')

# Admin credentials
ADMIN_EMAIL = "admin@gradacac.ba"
ADMIN_PASSWORD = "Gradacac2024!"

@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and get token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.status_code}"
    data = response.json()
    assert "token" in data, "Login response missing token"
    print(f"✓ Admin logged in successfully")
    return data["token"]


class TestAdminTourismCRUD:
    """Test admin tourism CRUD operations"""

    def test_create_attraction(self, admin_token):
        """POST /api/admin/tourism/attractions - Create new attraction"""
        new_attraction = {
            "name": "TEST_Gradska biblioteka",
            "description": "Moderna biblioteka sa bogatom kolekcijom knjiga i digitalnih resursa.",
            "latitude": 44.8800,
            "longitude": 18.4270,
            "category": "Kultura"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/tourism/attractions",
            json=new_attraction,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Create failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should have 'id' field"
        assert data["name"] == new_attraction["name"], f"Name mismatch: {data['name']}"
        assert data["description"] == new_attraction["description"], "Description mismatch"
        assert data["category"] == new_attraction["category"], "Category mismatch"
        assert data["latitude"] == new_attraction["latitude"], "Latitude mismatch"
        assert data["longitude"] == new_attraction["longitude"], "Longitude mismatch"
        
        # Store ID for later tests
        pytest.test_attraction_id = data["id"]
        print(f"✓ Created attraction: {data['name']} (ID: {data['id']})")

    def test_verify_creation_in_list(self):
        """GET /api/tourism/attractions - Verify created attraction appears in list"""
        response = requests.get(f"{BASE_URL}/api/tourism/attractions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Find our test attraction
        test_attraction = next((a for a in data if a.get("name") == "TEST_Gradska biblioteka"), None)
        assert test_attraction is not None, "Created attraction not found in list"
        assert test_attraction["category"] == "Kultura", "Category mismatch in list"
        
        print(f"✓ Created attraction verified in list: {test_attraction['name']}")

    def test_update_attraction(self, admin_token):
        """PUT /api/admin/tourism/attractions/{id} - Update attraction"""
        if not hasattr(pytest, 'test_attraction_id'):
            pytest.skip("No test attraction ID available")
        
        updated_data = {
            "name": "TEST_Gradska biblioteka (Updated)",
            "description": "Obnovljena biblioteka sa novim sadržajima.",
            "category": "Historija"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/tourism/attractions/{pytest.test_attraction_id}",
            json=updated_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Update failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert data["name"] == updated_data["name"], f"Name not updated: {data['name']}"
        assert data["description"] == updated_data["description"], "Description not updated"
        assert data["category"] == updated_data["category"], "Category not updated"
        
        print(f"✓ Updated attraction: {data['name']}")

    def test_verify_update_in_list(self):
        """GET /api/tourism/attractions - Verify update persisted"""
        response = requests.get(f"{BASE_URL}/api/tourism/attractions")
        assert response.status_code == 200
        
        data = response.json()
        test_attraction = next((a for a in data if a.get("name") == "TEST_Gradska biblioteka (Updated)"), None)
        assert test_attraction is not None, "Updated attraction not found"
        assert test_attraction["category"] == "Historija", "Category update not persisted"
        
        print(f"✓ Update verified in list: {test_attraction['name']} - {test_attraction['category']}")

    def test_delete_attraction(self, admin_token):
        """DELETE /api/admin/tourism/attractions/{id} - Delete attraction"""
        if not hasattr(pytest, 'test_attraction_id'):
            pytest.skip("No test attraction ID available")
        
        response = requests.delete(
            f"{BASE_URL}/api/admin/tourism/attractions/{pytest.test_attraction_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Delete failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "message" in data or "OK" in str(data), "Delete response should confirm deletion"
        
        print(f"✓ Deleted attraction ID: {pytest.test_attraction_id}")

    def test_verify_deletion_in_list(self):
        """GET /api/tourism/attractions - Verify attraction was deleted"""
        response = requests.get(f"{BASE_URL}/api/tourism/attractions")
        assert response.status_code == 200
        
        data = response.json()
        test_attraction = next((a for a in data if a.get("name", "").startswith("TEST_Gradska biblioteka")), None)
        assert test_attraction is None, "Deleted attraction still appears in list"
        
        print(f"✓ Deletion verified - attraction removed from list")


class TestAuthRequirement:
    """Test that admin endpoints require authentication"""

    def test_create_without_auth_fails(self):
        """POST /api/admin/tourism/attractions without auth should return 401"""
        new_attraction = {
            "name": "Unauthorized Test",
            "description": "This should fail",
            "category": "Ostalo"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/tourism/attractions",
            json=new_attraction
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Create without auth correctly returns 401")

    def test_update_without_auth_fails(self):
        """PUT /api/admin/tourism/attractions/{id} without auth should return 401"""
        response = requests.put(
            f"{BASE_URL}/api/admin/tourism/attractions/test-id",
            json={"name": "Test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Update without auth correctly returns 401")

    def test_delete_without_auth_fails(self):
        """DELETE /api/admin/tourism/attractions/{id} without auth should return 401"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/tourism/attractions/test-id"
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Delete without auth correctly returns 401")


class TestCategoryValidation:
    """Test category selector options"""

    def test_create_with_all_categories(self, admin_token):
        """Test creating attractions with all category options"""
        categories = ["Historija", "Priroda", "Kultura", "Religija", "Sport", "Ostalo"]
        created_ids = []
        
        for category in categories:
            attraction = {
                "name": f"TEST_{category}_Attraction",
                "description": f"Test attraction for {category} category",
                "latitude": 44.8797,
                "longitude": 18.4275,
                "category": category
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/tourism/attractions",
                json=attraction,
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200, f"Failed to create {category}: {response.status_code}"
            
            data = response.json()
            assert data["category"] == category, f"Category mismatch for {category}"
            created_ids.append(data["id"])
            print(f"✓ Created {category} attraction")
        
        # Cleanup - delete all test attractions
        for aid in created_ids:
            requests.delete(
                f"{BASE_URL}/api/admin/tourism/attractions/{aid}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        print(f"✓ All 6 categories validated and cleaned up")


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_delete_nonexistent_attraction(self, admin_token):
        """DELETE non-existent attraction should return 404"""
        response = requests.delete(
            f"{BASE_URL}/api/admin/tourism/attractions/nonexistent-id-12345",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Delete non-existent returns 404")

    def test_update_nonexistent_attraction(self, admin_token):
        """UPDATE non-existent attraction should return 404"""
        response = requests.put(
            f"{BASE_URL}/api/admin/tourism/attractions/nonexistent-id-12345",
            json={"name": "Test"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Update non-existent returns 404")
