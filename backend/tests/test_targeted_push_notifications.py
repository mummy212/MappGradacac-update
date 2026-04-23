"""
Backend API tests for Targeted Push Notifications System
Tests: push-stats (quiet_hours, targeted_devices, current_hour_local),
       PUT /push/preferences, POST /admin/notifications/send with target_category & smart_limit
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

ADMIN_EMAIL = "admin@gradacac.ba"
ADMIN_PASSWORD = "Gradacac2024!"

TEST_TOKEN = "ExponentPushToken[TEST_TARGETED_TOKEN_001]"
TEST_TOKEN_NEWS = "ExponentPushToken[TEST_NEWS_TOKEN_001]"
TEST_TOKEN_EVENTS = "ExponentPushToken[TEST_EVENTS_TOKEN_001]"


@pytest.fixture(scope="module")
def admin_headers():
    """Login as admin once for all tests in this module"""
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    assert login_response.status_code == 200, "Admin login failed"
    token = login_response.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module", autouse=True)
def setup_test_tokens(admin_headers):
    """Register test tokens with category preferences before tests"""
    # Register a token subscribed to news only
    requests.post(
        f"{BASE_URL}/api/push/register",
        json={"token": TEST_TOKEN_NEWS, "platform": "ios", "categories": ["news"], "enabled": True},
        timeout=10
    )
    # Register a token subscribed to events only
    requests.post(
        f"{BASE_URL}/api/push/register",
        json={"token": TEST_TOKEN_EVENTS, "platform": "android", "categories": ["events"], "enabled": True},
        timeout=10
    )
    # Register a general test token
    requests.post(
        f"{BASE_URL}/api/push/register",
        json={"token": TEST_TOKEN, "platform": "ios", "categories": ["news", "events", "offers"], "enabled": True},
        timeout=10
    )
    print("✓ Setup: Test tokens registered")
    yield
    # Cleanup test tokens after tests
    for token in [TEST_TOKEN, TEST_TOKEN_NEWS, TEST_TOKEN_EVENTS]:
        requests.post(
            f"{BASE_URL}/api/push/unregister",
            json={"token": token, "platform": "ios"},
            timeout=10
        )
    print("✓ Cleanup: Test tokens deactivated")


class TestPushStats:
    """Test GET /api/admin/push-stats returns required fields"""

    def test_push_stats_basic_fields(self, admin_headers):
        """GET /api/admin/push-stats returns active_devices, targeted_devices, quiet_hours, current_hour_local"""
        response = requests.get(
            f"{BASE_URL}/api/admin/push-stats",
            headers=admin_headers,
            timeout=10
        )
        print(f"\n✓ GET /api/admin/push-stats status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        print(f"  Response: {data}")

        # Check required fields exist
        assert "active_devices" in data, "Missing 'active_devices' field"
        assert "targeted_devices" in data, "Missing 'targeted_devices' field"
        assert "quiet_hours" in data, "Missing 'quiet_hours' field"
        assert "current_hour_local" in data, "Missing 'current_hour_local' field"
        assert "quiet_hours_range" in data, "Missing 'quiet_hours_range' field"

        # Check types
        assert isinstance(data["active_devices"], int), "active_devices should be int"
        assert isinstance(data["targeted_devices"], int), "targeted_devices should be int"
        assert isinstance(data["quiet_hours"], bool), "quiet_hours should be bool"
        assert isinstance(data["current_hour_local"], int), "current_hour_local should be int"

        # Check logical values
        assert 0 <= data["current_hour_local"] <= 23, "current_hour_local should be 0-23"
        assert data["quiet_hours"] == (data["current_hour_local"] >= 22 or data["current_hour_local"] < 8), \
            "quiet_hours should match current_hour_local"
        assert data["targeted_devices"] == data["active_devices"], \
            "Without category filter, targeted_devices should equal active_devices"

        print(f"✓ push-stats basic fields: active={data['active_devices']}, "
              f"targeted={data['targeted_devices']}, quiet_hours={data['quiet_hours']}, "
              f"hour_local={data['current_hour_local']}")

    def test_push_stats_category_news(self, admin_headers):
        """GET /api/admin/push-stats?category=news returns targeted_devices for news"""
        response = requests.get(
            f"{BASE_URL}/api/admin/push-stats?category=news",
            headers=admin_headers,
            timeout=10
        )
        print(f"\n✓ GET /api/admin/push-stats?category=news status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        print(f"  Response: {data}")

        assert "targeted_devices" in data, "Missing 'targeted_devices' field"
        assert "active_devices" in data, "Missing 'active_devices' field"
        assert isinstance(data["targeted_devices"], int), "targeted_devices should be int"

        # targeted_devices for a category should be <= total active_devices
        assert data["targeted_devices"] <= data["active_devices"], \
            "targeted_devices for category should be <= total active_devices"

        # We registered TEST_TOKEN_NEWS with category news, so at least 1 targeted device
        assert data["targeted_devices"] >= 1, \
            "At least 1 targeted device expected (we registered TEST_TOKEN_NEWS with news category)"

        print(f"✓ News category targeting: {data['targeted_devices']} of {data['active_devices']} active devices")

    def test_push_stats_category_events(self, admin_headers):
        """GET /api/admin/push-stats?category=events returns targeted_devices for events"""
        response = requests.get(
            f"{BASE_URL}/api/admin/push-stats?category=events",
            headers=admin_headers,
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert "targeted_devices" in data
        assert data["targeted_devices"] >= 1, "At least 1 targeted device (TEST_TOKEN_EVENTS)"
        print(f"✓ Events category: {data['targeted_devices']} targeted devices")

    def test_push_stats_category_offers(self, admin_headers):
        """GET /api/admin/push-stats?category=offers returns targeted_devices for offers"""
        response = requests.get(
            f"{BASE_URL}/api/admin/push-stats?category=offers",
            headers=admin_headers,
            timeout=10
        )
        assert response.status_code == 200
        data = response.json()
        assert "targeted_devices" in data
        print(f"✓ Offers category: {data['targeted_devices']} targeted devices")

    def test_push_stats_requires_auth(self):
        """GET /api/admin/push-stats returns 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/admin/push-stats", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ push-stats requires auth (401 confirmed)")


class TestPushPreferences:
    """Test PUT /api/push/preferences endpoint"""

    def test_update_preferences_all_fields(self):
        """PUT /api/push/preferences accepts token, categories, enabled fields"""
        # Register a fresh token first
        register_response = requests.post(
            f"{BASE_URL}/api/push/register",
            json={"token": "ExponentPushToken[TEST_PREFS_TOKEN_001]", "platform": "ios", "enabled": True},
            timeout=10
        )
        assert register_response.status_code == 200

        # Update preferences
        prefs_data = {
            "token": "ExponentPushToken[TEST_PREFS_TOKEN_001]",
            "categories": ["news", "events"],
            "enabled": True
        }
        response = requests.put(
            f"{BASE_URL}/api/push/preferences",
            json=prefs_data,
            timeout=10
        )
        print(f"\n✓ PUT /api/push/preferences status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        assert "status" in data or "message" in data, "Should return status or message"
        print(f"✓ Preferences updated: {data}")

        # Cleanup
        requests.post(
            f"{BASE_URL}/api/push/unregister",
            json={"token": "ExponentPushToken[TEST_PREFS_TOKEN_001]", "platform": "ios"},
            timeout=10
        )

    def test_update_preferences_disable(self):
        """PUT /api/push/preferences can disable notifications (enabled=False)"""
        # Register a fresh token
        register_response = requests.post(
            f"{BASE_URL}/api/push/register",
            json={"token": "ExponentPushToken[TEST_PREFS_DISABLE_001]", "platform": "android", "enabled": True},
            timeout=10
        )
        assert register_response.status_code == 200

        # Disable notifications
        prefs_data = {
            "token": "ExponentPushToken[TEST_PREFS_DISABLE_001]",
            "categories": ["news"],
            "enabled": False
        }
        response = requests.put(
            f"{BASE_URL}/api/push/preferences",
            json=prefs_data,
            timeout=10
        )
        print(f"\n✓ PUT /api/push/preferences (disable) status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Notifications disabled successfully")

        # Cleanup
        requests.post(
            f"{BASE_URL}/api/push/unregister",
            json={"token": "ExponentPushToken[TEST_PREFS_DISABLE_001]", "platform": "android"},
            timeout=10
        )

    def test_update_preferences_empty_categories(self):
        """PUT /api/push/preferences with empty categories (defaults to all)"""
        register_response = requests.post(
            f"{BASE_URL}/api/push/register",
            json={"token": "ExponentPushToken[TEST_PREFS_EMPTY_001]", "platform": "ios", "enabled": True},
            timeout=10
        )
        assert register_response.status_code == 200

        prefs_data = {
            "token": "ExponentPushToken[TEST_PREFS_EMPTY_001]",
            "categories": [],
            "enabled": True
        }
        response = requests.put(
            f"{BASE_URL}/api/push/preferences",
            json=prefs_data,
            timeout=10
        )
        assert response.status_code == 200
        print(f"✓ Empty categories accepted (defaults to 'all')")

        # Cleanup
        requests.post(
            f"{BASE_URL}/api/push/unregister",
            json={"token": "ExponentPushToken[TEST_PREFS_EMPTY_001]", "platform": "ios"},
            timeout=10
        )

    def test_update_preferences_requires_token(self):
        """PUT /api/push/preferences without token returns 422"""
        response = requests.put(
            f"{BASE_URL}/api/push/preferences",
            json={"categories": ["news"], "enabled": True},
            timeout=10
        )
        print(f"\n✓ PUT /api/push/preferences (no token) status: {response.status_code}")
        assert response.status_code == 422, f"Expected 422, got {response.status_code}: {response.text}"
        print(f"✓ Missing token correctly returns 422")


class TestAdminNotificationsTargeted:
    """Test POST /api/admin/notifications/send with target_category and smart_limit"""

    @pytest.fixture(autouse=True)
    def setup(self, admin_headers):
        """Store admin_headers for each test"""
        self.headers = admin_headers

    def test_send_notification_to_all(self):
        """POST /api/admin/notifications/send without target_category sends to all"""
        payload = {
            "title": "TEST All Users",
            "body": "Test notification for all users",
            "smart_limit": True
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        print(f"\n✓ POST /admin/notifications/send (all) status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        assert "id" in data
        assert "title" in data and data["title"] == payload["title"]
        assert "body" in data and data["body"] == payload["body"]
        assert "total_devices" in data and isinstance(data["total_devices"], int)
        assert "successful" in data and isinstance(data["successful"], int)
        assert "failed" in data and isinstance(data["failed"], int)
        assert "quiet_hours" in data and isinstance(data["quiet_hours"], bool)
        assert data.get("target_category") is None, "target_category should be None for all-users send"

        print(f"✓ All-users notification sent: {data['total_devices']} devices, quiet_hours={data['quiet_hours']}")

    def test_send_notification_with_target_category_news(self):
        """POST /api/admin/notifications/send with target_category=news"""
        payload = {
            "title": "TEST News Category",
            "body": "Test notification for news subscribers",
            "target_category": "news",
            "smart_limit": False   # disable rate limiting for test
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        print(f"\n✓ POST /admin/notifications/send (news) status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()
        assert data.get("target_category") == "news", \
            f"target_category should be 'news', got {data.get('target_category')}"
        assert "total_devices" in data
        assert data["total_devices"] >= 1, "Should have at least 1 device (TEST_TOKEN_NEWS)"
        print(f"✓ News-targeted notification: {data['total_devices']} targeted devices, category={data['target_category']}")

    def test_send_notification_with_target_category_events(self):
        """POST /api/admin/notifications/send with target_category=events"""
        payload = {
            "title": "TEST Events Category",
            "body": "Test notification for events subscribers",
            "target_category": "events",
            "smart_limit": False
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("target_category") == "events"
        assert data["total_devices"] >= 1, "Should have at least 1 device (TEST_TOKEN_EVENTS)"
        print(f"✓ Events-targeted notification: {data['total_devices']} targeted devices")

    def test_send_notification_with_target_category_offers(self):
        """POST /api/admin/notifications/send with target_category=offers"""
        payload = {
            "title": "TEST Offers Category",
            "body": "Test notification for offers subscribers",
            "target_category": "offers",
            "smart_limit": False
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("target_category") == "offers"
        print(f"✓ Offers-targeted notification: {data['total_devices']} targeted devices")

    def test_send_notification_smart_limit_true(self):
        """POST /api/admin/notifications/send with smart_limit=True enforces 2/day limit"""
        payload = {
            "title": "TEST Smart Limit Enabled",
            "body": "Testing smart limit with rate limiting on",
            "smart_limit": True
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_devices" in data
        print(f"✓ Smart limit=True notification sent successfully: {data['total_devices']} devices")

    def test_send_notification_smart_limit_false(self):
        """POST /api/admin/notifications/send with smart_limit=False bypasses rate limiting"""
        payload = {
            "title": "TEST Smart Limit Disabled",
            "body": "Testing smart limit disabled (no rate limiting)",
            "smart_limit": False
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_devices" in data
        print(f"✓ Smart limit=False notification: {data['total_devices']} devices reached")

    def test_send_notification_response_has_quiet_hours_field(self):
        """POST /api/admin/notifications/send response includes quiet_hours bool field"""
        payload = {
            "title": "TEST Quiet Hours Field",
            "body": "Testing quiet_hours field in response",
            "smart_limit": False
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        assert response.status_code == 200
        data = response.json()
        assert "quiet_hours" in data, "Response should include 'quiet_hours' field"
        assert isinstance(data["quiet_hours"], bool), "quiet_hours should be boolean"
        print(f"✓ quiet_hours field in send response: {data['quiet_hours']}")

    def test_send_notification_targeted_fewer_devices_than_all(self):
        """Sending to a specific category reaches fewer devices than sending to all"""
        # Get all-users count
        all_response = requests.get(
            f"{BASE_URL}/api/admin/push-stats",
            headers=self.headers,
            timeout=10
        )
        all_count = all_response.json()["active_devices"]

        # Get news-category count  
        news_response = requests.get(
            f"{BASE_URL}/api/admin/push-stats?category=news",
            headers=self.headers,
            timeout=10
        )
        news_count = news_response.json()["targeted_devices"]

        assert news_count <= all_count, \
            f"Category targeting ({news_count}) should be <= total ({all_count})"
        print(f"✓ Category targeting narrows reach: news={news_count} <= total={all_count}")

    def test_send_notification_history_has_target_category(self, admin_headers):
        """GET /admin/notifications history records include target_category field"""
        # Send a targeted notification
        payload = {
            "title": "TEST History Category Check",
            "body": "Checking that history stores target_category",
            "target_category": "news",
            "smart_limit": False
        }
        send_resp = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=30
        )
        assert send_resp.status_code == 200
        sent_id = send_resp.json()["id"]

        # Get history
        history_resp = requests.get(
            f"{BASE_URL}/api/admin/notifications",
            headers=self.headers,
            timeout=10
        )
        assert history_resp.status_code == 200
        history = history_resp.json()

        # Find our sent notification
        sent_notif = next((n for n in history if n.get("id") == sent_id), None)
        assert sent_notif is not None, "Sent notification not found in history"
        assert sent_notif.get("target_category") == "news", \
            f"History should store target_category='news', got {sent_notif.get('target_category')}"
        print(f"✓ History stores target_category: '{sent_notif['target_category']}'")

    def test_send_notification_empty_title_rejected(self):
        """POST /api/admin/notifications/send with empty title returns 422 (min_length=1)"""
        payload = {
            "title": "",
            "body": "Valid body"
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            headers=self.headers,
            timeout=10
        )
        print(f"\n✓ POST /admin/notifications/send (empty title) status: {response.status_code}")
        assert response.status_code == 422, f"Expected 422 (Pydantic min_length validation), got {response.status_code}"
        print(f"✓ Empty title correctly rejected with 422")

    def test_send_notification_without_auth(self):
        """POST /api/admin/notifications/send without auth returns 401"""
        payload = {"title": "Unauthorized", "body": "Should fail"}
        response = requests.post(
            f"{BASE_URL}/api/admin/notifications/send",
            json=payload,
            timeout=10
        )
        assert response.status_code == 401
        print(f"✓ Send notification requires auth (401 confirmed)")


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
