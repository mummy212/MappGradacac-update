"""
Backend API tests for Admin Panel - Image Upload and Notifications
Tests: Image upload/delete, Push notifications, Notification history
"""
import pytest
import requests
import os
import base64
from pathlib import Path
from dotenv import load_dotenv
from io import BytesIO

# Load frontend .env to get EXPO_PUBLIC_BACKEND_URL
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
if frontend_env.exists():
    load_dotenv(frontend_env)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment. Cannot run tests.")

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@gradacac.ba"
ADMIN_PASSWORD = "Gradacac2024!"


@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return token"""
    try:
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        token = data.get("token")
        assert token, "No token in login response"
        print(f"✓ Admin logged in successfully")
        return token
    except Exception as e:
        pytest.skip(f"Cannot login as admin: {str(e)}")


@pytest.fixture(scope="module")
def test_location_id():
    """Get first location ID for testing"""
    try:
        response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
        assert response.status_code == 200
        locations = response.json()
        assert len(locations) > 0, "No locations found"
        location_id = locations[0]["id"]
        print(f"✓ Using test location ID: {location_id}")
        return location_id
    except Exception as e:
        pytest.skip(f"Cannot get test location: {str(e)}")


class TestImageUpload:
    """Image upload and delete tests"""
    
    def test_upload_image_without_auth(self, test_location_id):
        """Test POST /api/admin/locations/{id}/images requires authentication"""
        try:
            # Create a small test image (1x1 red pixel PNG)
            img_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==")
            files = {'file': ('test.png', BytesIO(img_data), 'image/png')}
            
            response = requests.post(
                f"{BASE_URL}/api/admin/locations/{test_location_id}/images",
                files=files,
                timeout=10
            )
            print(f"✓ Upload without auth status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            print(f"✓ Image upload requires authentication")
            
        except Exception as e:
            print(f"✗ Upload without auth test failed: {str(e)}")
            raise
    
    def test_upload_image_with_auth(self, admin_token, test_location_id):
        """Test POST /api/admin/locations/{id}/images uploads image successfully"""
        try:
            # Create a small test image (1x1 red pixel PNG)
            img_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==")
            files = {'file': ('test.png', BytesIO(img_data), 'image/png')}
            
            response = requests.post(
                f"{BASE_URL}/api/admin/locations/{test_location_id}/images",
                files=files,
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            print(f"✓ Upload with auth status: {response.status_code}")
            assert response.status_code == 200, f"Upload failed: {response.text}"
            
            data = response.json()
            assert "message" in data
            assert "image" in data
            assert data["image"].startswith("data:image/"), "Image should be data URI"
            print(f"✓ Image uploaded successfully")
            print(f"  Message: {data['message']}")
            
            # Verify image was added to location
            loc_response = requests.get(f"{BASE_URL}/api/locations/{test_location_id}", timeout=10)
            assert loc_response.status_code == 200
            location = loc_response.json()
            assert "images" in location
            assert len(location["images"]) > 0, "Location should have at least 1 image"
            print(f"✓ Location now has {len(location['images'])} image(s)")
            
        except Exception as e:
            print(f"✗ Upload with auth test failed: {str(e)}")
            raise
    
    def test_upload_image_invalid_location(self, admin_token):
        """Test POST /api/admin/locations/{id}/images returns 404 for invalid location"""
        try:
            img_data = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==")
            files = {'file': ('test.png', BytesIO(img_data), 'image/png')}
            
            response = requests.post(
                f"{BASE_URL}/api/admin/locations/invalid-id-12345/images",
                files=files,
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            print(f"✓ Upload to invalid location status: {response.status_code}")
            assert response.status_code == 404, "Expected 404 for invalid location"
            print(f"✓ Returns 404 for invalid location")
            
        except Exception as e:
            print(f"✗ Invalid location test failed: {str(e)}")
            raise
    
    def test_delete_image_without_auth(self, test_location_id):
        """Test DELETE /api/admin/locations/{id}/images/{index} requires authentication"""
        try:
            response = requests.delete(
                f"{BASE_URL}/api/admin/locations/{test_location_id}/images/0",
                timeout=10
            )
            print(f"✓ Delete without auth status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            print(f"✓ Image delete requires authentication")
            
        except Exception as e:
            print(f"✗ Delete without auth test failed: {str(e)}")
            raise
    
    def test_delete_image_with_auth(self, admin_token, test_location_id):
        """Test DELETE /api/admin/locations/{id}/images/{index} deletes image successfully"""
        try:
            # First, get current image count
            loc_response = requests.get(f"{BASE_URL}/api/locations/{test_location_id}", timeout=10)
            assert loc_response.status_code == 200
            location = loc_response.json()
            initial_count = len(location.get("images", []))
            print(f"✓ Location has {initial_count} image(s) before delete")
            
            if initial_count == 0:
                print("⚠ No images to delete, skipping delete test")
                pytest.skip("No images to delete")
            
            # Delete first image
            response = requests.delete(
                f"{BASE_URL}/api/admin/locations/{test_location_id}/images/0",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            print(f"✓ Delete image status: {response.status_code}")
            assert response.status_code == 200, f"Delete failed: {response.text}"
            
            data = response.json()
            assert "message" in data
            print(f"✓ Image deleted: {data['message']}")
            
            # Verify image was removed
            loc_response = requests.get(f"{BASE_URL}/api/locations/{test_location_id}", timeout=10)
            assert loc_response.status_code == 200
            location = loc_response.json()
            final_count = len(location.get("images", []))
            assert final_count == initial_count - 1, "Image count should decrease by 1"
            print(f"✓ Location now has {final_count} image(s)")
            
        except Exception as e:
            print(f"✗ Delete image test failed: {str(e)}")
            raise
    
    def test_delete_image_invalid_index(self, admin_token, test_location_id):
        """Test DELETE /api/admin/locations/{id}/images/{index} returns 400 for invalid index"""
        try:
            response = requests.delete(
                f"{BASE_URL}/api/admin/locations/{test_location_id}/images/999",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            print(f"✓ Delete invalid index status: {response.status_code}")
            assert response.status_code == 400, "Expected 400 for invalid index"
            print(f"✓ Returns 400 for invalid image index")
            
        except Exception as e:
            print(f"✗ Invalid index test failed: {str(e)}")
            raise


class TestPushNotifications:
    """Push notification tests"""
    
    def test_get_push_stats_without_auth(self):
        """Test GET /api/admin/push-stats requires authentication"""
        try:
            response = requests.get(f"{BASE_URL}/api/admin/push-stats", timeout=10)
            print(f"✓ Push stats without auth status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            print(f"✓ Push stats requires authentication")
            
        except Exception as e:
            print(f"✗ Push stats without auth test failed: {str(e)}")
            raise
    
    def test_get_push_stats_with_auth(self, admin_token):
        """Test GET /api/admin/push-stats returns active device count"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/admin/push-stats",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            print(f"✓ Push stats with auth status: {response.status_code}")
            assert response.status_code == 200, f"Push stats failed: {response.text}"
            
            data = response.json()
            assert "active_devices" in data
            assert isinstance(data["active_devices"], int)
            print(f"✓ Active devices: {data['active_devices']}")
            
        except Exception as e:
            print(f"✗ Push stats test failed: {str(e)}")
            raise
    
    def test_get_notifications_without_auth(self):
        """Test GET /api/admin/notifications requires authentication"""
        try:
            response = requests.get(f"{BASE_URL}/api/admin/notifications", timeout=10)
            print(f"✓ Notifications without auth status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            print(f"✓ Notifications endpoint requires authentication")
            
        except Exception as e:
            print(f"✗ Notifications without auth test failed: {str(e)}")
            raise
    
    def test_get_notifications_with_auth(self, admin_token):
        """Test GET /api/admin/notifications returns notification history"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/admin/notifications",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            print(f"✓ Notifications with auth status: {response.status_code}")
            assert response.status_code == 200, f"Notifications failed: {response.text}"
            
            data = response.json()
            assert isinstance(data, list), "Expected list of notifications"
            print(f"✓ Notification history count: {len(data)}")
            
            # Verify structure if notifications exist
            if len(data) > 0:
                notif = data[0]
                required_fields = ["id", "title", "body", "total_devices", "successful", "failed", "created_at"]
                for field in required_fields:
                    assert field in notif, f"Missing field: {field}"
                print(f"✓ Notification structure valid")
                print(f"  Sample: {notif['title']} - {notif['total_devices']} devices")
            
        except Exception as e:
            print(f"✗ Get notifications test failed: {str(e)}")
            raise
    
    def test_send_notification_without_auth(self):
        """Test POST /api/admin/notifications/send requires authentication"""
        try:
            response = requests.post(
                f"{BASE_URL}/api/admin/notifications/send",
                json={"title": "Test", "body": "Test notification"},
                timeout=10
            )
            print(f"✓ Send notification without auth status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            print(f"✓ Send notification requires authentication")
            
        except Exception as e:
            print(f"✗ Send notification without auth test failed: {str(e)}")
            raise
    
    def test_send_notification_with_auth(self, admin_token):
        """Test POST /api/admin/notifications/send sends notification successfully"""
        try:
            notification = {
                "title": "TEST_Notification",
                "body": "This is a test notification from automated tests"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/notifications/send",
                json=notification,
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=30  # Longer timeout for push notification
            )
            print(f"✓ Send notification status: {response.status_code}")
            assert response.status_code == 200, f"Send notification failed: {response.text}"
            
            data = response.json()
            required_fields = ["id", "title", "body", "total_devices", "successful", "failed", "created_at"]
            for field in required_fields:
                assert field in data, f"Missing field: {field}"
            
            assert data["title"] == notification["title"]
            assert data["body"] == notification["body"]
            print(f"✓ Notification sent successfully")
            print(f"  Total devices: {data['total_devices']}")
            print(f"  Successful: {data['successful']}")
            print(f"  Failed: {data['failed']}")
            
            # Verify notification appears in history
            history_response = requests.get(
                f"{BASE_URL}/api/admin/notifications",
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            assert history_response.status_code == 200
            history = history_response.json()
            
            # Find our test notification
            test_notif = next((n for n in history if n["title"] == "TEST_Notification"), None)
            assert test_notif is not None, "Test notification not found in history"
            print(f"✓ Notification appears in history")
            
        except Exception as e:
            print(f"✗ Send notification test failed: {str(e)}")
            raise
    
    def test_send_notification_empty_title(self, admin_token):
        """Test POST /api/admin/notifications/send validates title"""
        try:
            response = requests.post(
                f"{BASE_URL}/api/admin/notifications/send",
                json={"title": "", "body": "Test body"},
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            print(f"✓ Send notification with empty title status: {response.status_code}")
            # Backend should validate this (422 for validation error)
            assert response.status_code in [400, 422], "Expected validation error for empty title"
            print(f"✓ Validates empty title")
            
        except Exception as e:
            print(f"✗ Empty title validation test failed: {str(e)}")
            raise
    
    def test_send_notification_empty_body(self, admin_token):
        """Test POST /api/admin/notifications/send validates body"""
        try:
            response = requests.post(
                f"{BASE_URL}/api/admin/notifications/send",
                json={"title": "Test", "body": ""},
                headers={"Authorization": f"Bearer {admin_token}"},
                timeout=10
            )
            print(f"✓ Send notification with empty body status: {response.status_code}")
            # Backend should validate this (422 for validation error)
            assert response.status_code in [400, 422], "Expected validation error for empty body"
            print(f"✓ Validates empty body")
            
        except Exception as e:
            print(f"✗ Empty body validation test failed: {str(e)}")
            raise


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
