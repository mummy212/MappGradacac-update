"""
Backend API tests for Push Notification Infrastructure
Tests: Push token registration, admin notification sending, push stats
"""
import pytest
import requests
import os
from pathlib import Path
from dotenv import load_dotenv
import time

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


class TestPushTokenRegistration:
    """Test public push token registration endpoints (no auth required)"""
    
    def test_register_push_token(self):
        """Test POST /api/push/register stores push token"""
        try:
            token_data = {
                "token": "ExponentPushToken[TEST_TOKEN_12345]",
                "platform": "ios"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/push/register",
                json=token_data,
                timeout=10
            )
            print(f"✓ POST /api/push/register status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "message" in data
            print(f"✓ Push token registered successfully")
            print(f"  Token: {token_data['token']}")
            print(f"  Platform: {token_data['platform']}")
            print(f"  Response: {data['message']}")
            
        except Exception as e:
            print(f"✗ Register push token test failed: {str(e)}")
            raise
    
    def test_register_push_token_without_token(self):
        """Test POST /api/push/register without token returns 400"""
        try:
            token_data = {
                "token": "",
                "platform": "android"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/push/register",
                json=token_data,
                timeout=10
            )
            print(f"✓ POST /api/push/register (empty token) status: {response.status_code}")
            assert response.status_code == 400, f"Expected 400, got {response.status_code}"
            
            data = response.json()
            assert "detail" in data
            print(f"✓ Empty token correctly rejected with 400")
            print(f"  Error: {data['detail']}")
            
        except Exception as e:
            print(f"✗ Register without token test failed: {str(e)}")
            raise
    
    def test_register_duplicate_token_updates(self):
        """Test registering same token twice updates existing record (upsert)"""
        try:
            token_data = {
                "token": "ExponentPushToken[TEST_DUPLICATE_TOKEN]",
                "platform": "ios"
            }
            
            # Register first time
            response1 = requests.post(
                f"{BASE_URL}/api/push/register",
                json=token_data,
                timeout=10
            )
            assert response1.status_code == 200
            print(f"✓ First registration successful")
            
            # Register same token again with different platform
            token_data["platform"] = "android"
            response2 = requests.post(
                f"{BASE_URL}/api/push/register",
                json=token_data,
                timeout=10
            )
            assert response2.status_code == 200
            print(f"✓ Second registration (upsert) successful")
            print(f"✓ Duplicate token handling works (upsert)")
            
        except Exception as e:
            print(f"✗ Duplicate token test failed: {str(e)}")
            raise
    
    def test_unregister_push_token(self):
        """Test POST /api/push/unregister deactivates token"""
        try:
            # Register a token first
            token_data = {
                "token": "ExponentPushToken[TEST_UNREGISTER_TOKEN]",
                "platform": "ios"
            }
            
            register_response = requests.post(
                f"{BASE_URL}/api/push/register",
                json=token_data,
                timeout=10
            )
            assert register_response.status_code == 200
            print(f"✓ Token registered for unregister test")
            
            # Unregister it
            response = requests.post(
                f"{BASE_URL}/api/push/unregister",
                json=token_data,
                timeout=10
            )
            print(f"✓ POST /api/push/unregister status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "message" in data
            print(f"✓ Push token unregistered successfully")
            print(f"  Response: {data['message']}")
            
        except Exception as e:
            print(f"✗ Unregister push token test failed: {str(e)}")
            raise


class TestAdminPushStats:
    """Test admin push stats endpoint (requires auth)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert login_response.status_code == 200, "Admin login failed in setup"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        print(f"✓ Setup: Admin logged in")
    
    def test_get_push_stats_with_auth(self):
        """Test GET /api/admin/push-stats returns active device count"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/admin/push-stats",
                headers=self.headers,
                timeout=10
            )
            print(f"✓ GET /api/admin/push-stats status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "active_devices" in data, "Missing 'active_devices' field"
            assert isinstance(data["active_devices"], int), "active_devices should be integer"
            
            print(f"✓ Push stats retrieved successfully")
            print(f"  Active devices: {data['active_devices']}")
            
        except Exception as e:
            print(f"✗ Get push stats test failed: {str(e)}")
            raise
    
    def test_get_push_stats_without_auth(self):
        """Test GET /api/admin/push-stats without auth returns 401"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/admin/push-stats",
                timeout=10
            )
            print(f"✓ GET /api/admin/push-stats (no auth) status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            
            print(f"✓ Push stats requires auth (401 without token)")
            
        except Exception as e:
            print(f"✗ Push stats without auth test failed: {str(e)}")
            raise


class TestAdminNotifications:
    """Test admin notification sending and history (requires auth)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin and register test tokens before each test"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert login_response.status_code == 200, "Admin login failed in setup"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Register a test push token
        requests.post(
            f"{BASE_URL}/api/push/register",
            json={"token": "ExponentPushToken[TEST_NOTIFICATION_TOKEN]", "platform": "ios"},
            timeout=10
        )
        
        print(f"✓ Setup: Admin logged in, test token registered")
    
    def test_send_notification_with_auth(self):
        """Test POST /api/admin/notifications/send sends notification"""
        try:
            notification_data = {
                "title": "TEST Notification",
                "body": "This is a test notification from automated tests"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/notifications/send",
                json=notification_data,
                headers=self.headers,
                timeout=30  # Longer timeout for external API call
            )
            print(f"✓ POST /api/admin/notifications/send status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            
            # Verify response structure
            assert "id" in data, "Missing 'id' field"
            assert "title" in data, "Missing 'title' field"
            assert "body" in data, "Missing 'body' field"
            assert "total_devices" in data, "Missing 'total_devices' field"
            assert "successful" in data, "Missing 'successful' field"
            assert "failed" in data, "Missing 'failed' field"
            assert "created_at" in data, "Missing 'created_at' field"
            
            # Verify data
            assert data["title"] == notification_data["title"]
            assert data["body"] == notification_data["body"]
            assert isinstance(data["total_devices"], int)
            assert isinstance(data["successful"], int)
            assert isinstance(data["failed"], int)
            
            print(f"✓ Notification sent successfully")
            print(f"  Title: {data['title']}")
            print(f"  Body: {data['body']}")
            print(f"  Total devices: {data['total_devices']}")
            print(f"  Successful: {data['successful']}")
            print(f"  Failed: {data['failed']}")
            
            # Note: Actual delivery only works on physical devices
            # We're testing API structure and response format
            print(f"  Note: Actual push delivery only works on physical devices with valid Expo tokens")
            
        except Exception as e:
            print(f"✗ Send notification test failed: {str(e)}")
            raise
    
    def test_send_notification_without_auth(self):
        """Test POST /api/admin/notifications/send without auth returns 401"""
        try:
            notification_data = {
                "title": "Unauthorized Test",
                "body": "This should fail"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/notifications/send",
                json=notification_data,
                timeout=10
            )
            print(f"✓ POST /api/admin/notifications/send (no auth) status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            
            print(f"✓ Send notification requires auth (401 without token)")
            
        except Exception as e:
            print(f"✗ Send notification without auth test failed: {str(e)}")
            raise
    
    def test_get_notification_history_with_auth(self):
        """Test GET /api/admin/notifications returns notification history"""
        try:
            # Send a notification first to ensure there's history
            notification_data = {
                "title": "TEST History Notification",
                "body": "Testing notification history retrieval"
            }
            
            send_response = requests.post(
                f"{BASE_URL}/api/admin/notifications/send",
                json=notification_data,
                headers=self.headers,
                timeout=30
            )
            assert send_response.status_code == 200
            sent_notification = send_response.json()
            print(f"✓ Test notification sent for history test")
            
            time.sleep(0.5)  # Brief wait for DB write
            
            # Get notification history
            response = requests.get(
                f"{BASE_URL}/api/admin/notifications",
                headers=self.headers,
                timeout=10
            )
            print(f"✓ GET /api/admin/notifications status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert isinstance(data, list), "Expected list of notifications"
            print(f"✓ Notification history retrieved: {len(data)} notifications")
            
            # Verify our sent notification is in history
            notification_ids = [n.get("id") for n in data]
            assert sent_notification["id"] in notification_ids, "Sent notification not found in history"
            
            # Verify structure of first notification
            if data:
                notif = data[0]
                assert "id" in notif
                assert "title" in notif
                assert "body" in notif
                assert "total_devices" in notif
                assert "successful" in notif
                assert "failed" in notif
                assert "created_at" in notif
                print(f"  Latest notification: {notif['title']}")
                print(f"  Sent to {notif['total_devices']} devices ({notif['successful']} successful, {notif['failed']} failed)")
            
            print(f"✓ Notification history working correctly")
            
        except Exception as e:
            print(f"✗ Get notification history test failed: {str(e)}")
            raise
    
    def test_get_notification_history_without_auth(self):
        """Test GET /api/admin/notifications without auth returns 401"""
        try:
            response = requests.get(
                f"{BASE_URL}/api/admin/notifications",
                timeout=10
            )
            print(f"✓ GET /api/admin/notifications (no auth) status: {response.status_code}")
            assert response.status_code == 401, f"Expected 401, got {response.status_code}"
            
            print(f"✓ Notification history requires auth (401 without token)")
            
        except Exception as e:
            print(f"✗ Get notification history without auth test failed: {str(e)}")
            raise
    
    def test_send_notification_with_empty_title(self):
        """Test sending notification with empty title returns 422 (min_length=1 validation)"""
        try:
            notification_data = {
                "title": "",
                "body": "Body without title"
            }
            
            response = requests.post(
                f"{BASE_URL}/api/admin/notifications/send",
                json=notification_data,
                headers=self.headers,
                timeout=10
            )
            print(f"✓ POST /api/admin/notifications/send (empty title) status: {response.status_code}")
            # NotificationCreate has min_length=1 on title - empty string is rejected
            assert response.status_code == 422, f"Expected 422 (Pydantic min_length validation), got {response.status_code}"
            print(f"✓ Empty title correctly rejected with 422 (min_length=1)")
            
        except Exception as e:
            print(f"✗ Empty title test failed: {str(e)}")
            raise


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
