"""
Backend API tests for Admin Authentication and CRUD
Tests: Admin login, JWT auth, location CRUD operations
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

# Test credentials from /app/memory/test_credentials.md
ADMIN_EMAIL = "admin@gradacac.ba"
ADMIN_PASSWORD = "Gradacac2024!"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_login_with_correct_credentials(self):
        """Test POST /api/auth/login with correct admin credentials returns token"""
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=10
            )
            print(f"✓ Login status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            print(f"✓ Login response keys: {list(data.keys())}")
            
            # Verify response structure
            assert "token" in data, "Missing 'token' in response"
            assert "email" in data, "Missing 'email' in response"
            assert "role" in data, "Missing 'role' in response"
            
            # Verify admin role
            assert data["role"] == "admin", f"Expected role 'admin', got {data['role']}"
            assert data["email"] == ADMIN_EMAIL, f"Expected email {ADMIN_EMAIL}, got {data['email']}"
            
            # Verify token is not empty
            assert len(data["token"]) > 0, "Token is empty"
            
            print(f"✓ Admin login successful")
            print(f"  Email: {data['email']}")
            print(f"  Role: {data['role']}")
            print(f"  Token length: {len(data['token'])} chars")
            
        except Exception as e:
            print(f"✗ Admin login test failed: {str(e)}")
            raise
    
    def test_login_with_wrong_password(self):
        """Test POST /api/auth/login with wrong password returns 401"""
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL, "password": "WrongPassword123!"},
                timeout=10
            )
            print(f"✓ Wrong password status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            
            data = response.json()
            assert "detail" in data, "Missing error detail"
            print(f"✓ Error message: {data['detail']}")
            print(f"✓ Wrong password correctly rejected with 401")
            
        except Exception as e:
            print(f"✗ Wrong password test failed: {str(e)}")
            raise
    
    def test_login_with_wrong_email(self):
        """Test POST /api/auth/login with non-existent email returns 401"""
        try:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": "nonexistent@example.com", "password": ADMIN_PASSWORD},
                timeout=10
            )
            print(f"✓ Wrong email status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print(f"✓ Wrong email correctly rejected with 401")
            
        except Exception as e:
            print(f"✗ Wrong email test failed: {str(e)}")
            raise
    
    def test_get_current_user_with_token(self):
        """Test GET /api/auth/me with valid token returns user info"""
        try:
            # Login first
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=10
            )
            assert login_response.status_code == 200
            token = login_response.json()["token"]
            
            # Get current user
            response = requests.get(
                f"{BASE_URL}/api/auth/me",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            print(f"✓ Get current user status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert data["email"] == ADMIN_EMAIL
            assert data["role"] == "admin"
            print(f"✓ Current user endpoint working")
            
        except Exception as e:
            print(f"✗ Get current user test failed: {str(e)}")
            raise
    
    def test_get_current_user_without_token(self):
        """Test GET /api/auth/me without token returns 401"""
        try:
            response = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
            print(f"✓ No token status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print(f"✓ Auth required - correctly rejected with 401")
            
        except Exception as e:
            print(f"✗ No token test failed: {str(e)}")
            raise


class TestAdminLocationCRUD:
    """Admin location CRUD operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get token before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert login_response.status_code == 200, "Admin login failed in setup"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✓ Setup: Admin logged in, token obtained")
    
    def test_create_location_with_auth(self):
        """Test POST /api/admin/locations creates location with Bearer token"""
        try:
            new_location = {
                "name": "TEST_Admin_Created_Location",
                "category": "cafe",
                "address": "Test Admin Street 123",
                "latitude": 44.8800,
                "longitude": 18.4280,
                "phone": "+387 35 111 222",
                "description": "Test location created by admin",
                "working_hours": "08:00 - 20:00",
                "is_premium": True
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/locations",
                json=new_location,
                headers=self.headers,
                timeout=10
            )
            print(f"✓ Create location status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "id" in data, "Missing 'id' in response"
            assert data["name"] == new_location["name"]
            assert data["category"] == new_location["category"]
            assert data["is_premium"] == True
            
            self.created_location_id = data["id"]
            print(f"✓ Location created successfully")
            print(f"  ID: {data['id']}")
            print(f"  Name: {data['name']}")
            print(f"  Premium: {data['is_premium']}")
            
            # Verify persistence with GET
            get_response = requests.get(f"{BASE_URL}/api/locations/{data['id']}", timeout=10)
            assert get_response.status_code == 200
            retrieved = get_response.json()
            assert retrieved["name"] == new_location["name"]
            print(f"✓ Location persisted correctly (verified with GET)")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/admin/locations/{data['id']}", headers=self.headers, timeout=10)
            print(f"✓ Cleanup: deleted test location")
            
        except Exception as e:
            print(f"✗ Create location test failed: {str(e)}")
            raise
    
    def test_create_location_without_auth(self):
        """Test POST /api/admin/locations without auth returns 401"""
        try:
            new_location = {
                "name": "TEST_Unauthorized",
                "category": "cafe",
                "address": "Test Street",
                "latitude": 44.8800,
                "longitude": 18.4280
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/locations",
                json=new_location,
                timeout=10
            )
            print(f"✓ Create without auth status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print(f"✓ Unauthorized request correctly rejected with 401")
            
        except Exception as e:
            print(f"✗ Create without auth test failed: {str(e)}")
            raise
    
    def test_update_location_with_auth(self):
        """Test PUT /api/admin/locations/{id} updates location with Bearer token"""
        try:
            # Create test location first
            new_location = {
                "name": "TEST_Update_Original",
                "category": "cafe",
                "address": "Original Address",
                "latitude": 44.8800,
                "longitude": 18.4280
            }
            
            create_response = requests.post(
                f"{BASE_URL}/api/admin/locations",
                json=new_location,
                headers=self.headers,
                timeout=10
            )
            assert create_response.status_code == 200
            location_id = create_response.json()["id"]
            print(f"✓ Created test location for update: {location_id}")
            
            # Update it
            update_data = {
                "name": "TEST_Update_Modified",
                "address": "Modified Address",
                "phone": "+387 35 999 888"
            }
            
            response = requests.put(
                f"{BASE_URL}/api/admin/locations/{location_id}",
                json=update_data,
                headers=self.headers,
                timeout=10
            )
            print(f"✓ Update location status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert data["name"] == update_data["name"], f"Name not updated"
            assert data["address"] == update_data["address"], f"Address not updated"
            assert data["phone"] == update_data["phone"], f"Phone not updated"
            print(f"✓ Location updated successfully")
            
            # Verify persistence with GET
            get_response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            assert get_response.status_code == 200
            retrieved = get_response.json()
            assert retrieved["name"] == update_data["name"]
            assert retrieved["address"] == update_data["address"]
            print(f"✓ Update persisted correctly (verified with GET)")
            
            # Cleanup
            requests.delete(f"{BASE_URL}/api/admin/locations/{location_id}", headers=self.headers, timeout=10)
            print(f"✓ Cleanup: deleted test location")
            
        except Exception as e:
            print(f"✗ Update location test failed: {str(e)}")
            raise
    
    def test_update_location_without_auth(self):
        """Test PUT /api/admin/locations/{id} without auth returns 401"""
        try:
            response = requests.put(
                f"{BASE_URL}/api/admin/locations/fake-id",
                json={"name": "Test"},
                timeout=10
            )
            print(f"✓ Update without auth status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print(f"✓ Unauthorized update correctly rejected with 401")
            
        except Exception as e:
            print(f"✗ Update without auth test failed: {str(e)}")
            raise
    
    def test_delete_location_with_auth(self):
        """Test DELETE /api/admin/locations/{id} deletes location with Bearer token"""
        try:
            # Create test location first
            new_location = {
                "name": "TEST_Delete_Me",
                "category": "cafe",
                "address": "Delete Test Address",
                "latitude": 44.8800,
                "longitude": 18.4280
            }
            
            create_response = requests.post(
                f"{BASE_URL}/api/admin/locations",
                json=new_location,
                headers=self.headers,
                timeout=10
            )
            assert create_response.status_code == 200
            location_id = create_response.json()["id"]
            print(f"✓ Created test location for deletion: {location_id}")
            
            # Delete it
            response = requests.delete(
                f"{BASE_URL}/api/admin/locations/{location_id}",
                headers=self.headers,
                timeout=10
            )
            print(f"✓ Delete location status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "message" in data
            print(f"✓ Delete response: {data['message']}")
            
            # Verify deletion with GET (should return 404)
            get_response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            print(f"✓ Get deleted location status: {get_response.status_code}")
            assert get_response.status_code == 404, f"Expected 404, got {get_response.status_code}"
            print(f"✓ Location successfully deleted and verified")
            
        except Exception as e:
            print(f"✗ Delete location test failed: {str(e)}")
            raise
    
    def test_delete_location_without_auth(self):
        """Test DELETE /api/admin/locations/{id} without auth returns 401"""
        try:
            response = requests.delete(
                f"{BASE_URL}/api/admin/locations/fake-id",
                timeout=10
            )
            print(f"✓ Delete without auth status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            print(f"✓ Unauthorized delete correctly rejected with 401")
            
        except Exception as e:
            print(f"✗ Delete without auth test failed: {str(e)}")
            raise
    
    def test_update_nonexistent_location(self):
        """Test PUT /api/admin/locations/{id} with non-existent ID returns 404"""
        try:
            response = requests.put(
                f"{BASE_URL}/api/admin/locations/nonexistent-id-12345",
                json={"name": "Test"},
                headers=self.headers,
                timeout=10
            )
            print(f"✓ Update nonexistent location status: {response.status_code}")
            assert response.status_code == 404, f"Expected 404, got {response.status_code}"
            print(f"✓ Nonexistent location correctly returns 404")
            
        except Exception as e:
            print(f"✗ Update nonexistent location test failed: {str(e)}")
            raise
    
    def test_delete_nonexistent_location(self):
        """Test DELETE /api/admin/locations/{id} with non-existent ID returns 404"""
        try:
            response = requests.delete(
                f"{BASE_URL}/api/admin/locations/nonexistent-id-12345",
                headers=self.headers,
                timeout=10
            )
            print(f"✓ Delete nonexistent location status: {response.status_code}")
            assert response.status_code == 404, f"Expected 404, got {response.status_code}"
            print(f"✓ Nonexistent location correctly returns 404")
            
        except Exception as e:
            print(f"✗ Delete nonexistent location test failed: {str(e)}")
            raise


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
