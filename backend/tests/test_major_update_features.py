"""
Backend API tests for major update features
Tests: Loyalty/points system, Chat/messages, Tourism attractions, Leaderboard, Business account management
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


class TestLoyaltySystem:
    """Test loyalty/points system endpoints"""
    
    def test_loyalty_checkin_success(self):
        """Test POST /api/loyalty/checkin earns points"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            # Checkin
            payload = {
                "user_name": "TEST_Loyalty_User",
                "location_id": loc_id
            }
            
            response = requests.post(f"{BASE_URL}/api/loyalty/checkin", json=payload, timeout=10)
            print(f"✓ POST /api/loyalty/checkin status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert "points" in data, "Response missing points field"
            assert "total_visits" in data, "Response missing total_visits field"
            assert "message" in data, "Response missing message field"
            assert isinstance(data["points"], int), "points should be integer"
            assert isinstance(data["total_visits"], int), "total_visits should be integer"
            assert data["points"] >= 10, "Should earn at least 10 points"
            assert data["total_visits"] >= 1, "Should have at least 1 visit"
            
            print(f"✓ Loyalty checkin successful: {data['points']} points, {data['total_visits']} visits")
            print(f"  Message: {data['message']}")
            
        except Exception as e:
            print(f"✗ Loyalty checkin test failed: {str(e)}")
            raise
    
    def test_loyalty_checkin_invalid_location(self):
        """Test POST /api/loyalty/checkin with invalid location returns 404"""
        try:
            payload = {
                "user_name": "TEST_User",
                "location_id": "invalid-location-id-12345"
            }
            
            response = requests.post(f"{BASE_URL}/api/loyalty/checkin", json=payload, timeout=10)
            print(f"✓ POST /api/loyalty/checkin (invalid location) status: {response.status_code}")
            assert response.status_code == 404, "Expected 404 for invalid location"
            
            print(f"✓ Invalid location rejected with 404")
            
        except Exception as e:
            print(f"✗ Invalid location test failed: {str(e)}")
            raise
    
    def test_get_loyalty_data(self):
        """Test GET /api/loyalty/{user_name} returns loyalty data"""
        try:
            # First do a checkin to ensure data exists
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            loc_id = all_locs[0]["id"]
            
            user_name = "TEST_Loyalty_Get_User"
            checkin_payload = {"user_name": user_name, "location_id": loc_id}
            requests.post(f"{BASE_URL}/api/loyalty/checkin", json=checkin_payload, timeout=10)
            
            # Now get loyalty data
            response = requests.get(f"{BASE_URL}/api/loyalty/{user_name}", timeout=10)
            print(f"✓ GET /api/loyalty/{user_name} status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert "user_name" in data
            assert "points" in data
            assert "total_visits" in data
            assert "visits" in data
            assert isinstance(data["visits"], list), "visits should be array"
            
            print(f"✓ Loyalty data retrieved: {data['points']} points, {data['total_visits']} visits")
            
            if len(data["visits"]) > 0:
                visit = data["visits"][0]
                assert "location_id" in visit
                assert "location_name" in visit
                assert "date" in visit
                print(f"  Latest visit: {visit['location_name']} on {visit['date']}")
            
        except Exception as e:
            print(f"✗ Get loyalty data test failed: {str(e)}")
            raise
    
    def test_get_loyalty_nonexistent_user(self):
        """Test GET /api/loyalty/{user_name} for nonexistent user returns empty data"""
        try:
            user_name = "NONEXISTENT_USER_12345"
            response = requests.get(f"{BASE_URL}/api/loyalty/{user_name}", timeout=10)
            print(f"✓ GET /api/loyalty/{user_name} status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert data["points"] == 0, "Nonexistent user should have 0 points"
            assert data["total_visits"] == 0, "Nonexistent user should have 0 visits"
            assert data["visits"] == [], "Nonexistent user should have empty visits array"
            
            print(f"✓ Nonexistent user returns empty data (correct behavior)")
            
        except Exception as e:
            print(f"✗ Nonexistent user test failed: {str(e)}")
            raise


class TestChatMessages:
    """Test chat/messages endpoints"""
    
    def test_send_message_to_location(self):
        """Test POST /api/locations/{id}/messages sends message"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            payload = {
                "sender_name": "TEST User",
                "message": "Test message - Imate li slobodnih termina?"
            }
            
            response = requests.post(f"{BASE_URL}/api/locations/{loc_id}/messages", json=payload, timeout=10)
            print(f"✓ POST /api/locations/{loc_id}/messages status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert "id" in data, "Response missing id field"
            assert "location_id" in data
            assert "sender_name" in data
            assert "message" in data
            assert "created_at" in data
            assert data["location_id"] == loc_id
            assert data["sender_name"] == payload["sender_name"]
            assert data["message"] == payload["message"]
            
            print(f"✓ Message sent successfully: {data['id']}")
            print(f"  From: {data['sender_name']}")
            print(f"  Message: {data['message']}")
            
        except Exception as e:
            print(f"✗ Send message test failed: {str(e)}")
            raise
    
    def test_send_message_invalid_location(self):
        """Test POST /api/locations/{id}/messages with invalid location returns 404"""
        try:
            payload = {
                "sender_name": "TEST User",
                "message": "Test message"
            }
            
            response = requests.post(f"{BASE_URL}/api/locations/invalid-id-12345/messages", json=payload, timeout=10)
            print(f"✓ POST /api/locations/invalid-id/messages status: {response.status_code}")
            assert response.status_code == 404, "Expected 404 for invalid location"
            
            print(f"✓ Invalid location rejected with 404")
            
        except Exception as e:
            print(f"✗ Invalid location message test failed: {str(e)}")
            raise
    
    def test_get_location_messages(self):
        """Test GET /api/locations/{id}/messages returns messages"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            # Send a message first
            send_payload = {"sender_name": "TEST Sender", "message": "Test message for retrieval"}
            requests.post(f"{BASE_URL}/api/locations/{loc_id}/messages", json=send_payload, timeout=10)
            
            # Get messages
            response = requests.get(f"{BASE_URL}/api/locations/{loc_id}/messages", timeout=10)
            print(f"✓ GET /api/locations/{loc_id}/messages status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert isinstance(data, list), "Response should be array"
            print(f"✓ Messages retrieved: {len(data)} messages")
            
            if len(data) > 0:
                msg = data[0]
                assert "id" in msg
                assert "sender_name" in msg
                assert "message" in msg
                assert "created_at" in msg
                print(f"  Latest message from: {msg['sender_name']}")
            
        except Exception as e:
            print(f"✗ Get messages test failed: {str(e)}")
            raise


class TestTourismAttractions:
    """Test tourism attractions endpoint"""
    
    def test_get_attractions(self):
        """Test GET /api/tourism/attractions returns 5 attractions"""
        try:
            response = requests.get(f"{BASE_URL}/api/tourism/attractions", timeout=10)
            print(f"✓ GET /api/tourism/attractions status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert isinstance(data, list), "Response should be array"
            assert len(data) == 5, f"Expected 5 attractions, got {len(data)}"
            
            print(f"✓ Attractions retrieved: {len(data)} attractions")
            
            # Check structure
            for attraction in data:
                assert "id" in attraction
                assert "name" in attraction
                assert "description" in attraction
                assert "latitude" in attraction
                assert "longitude" in attraction
                assert "category" in attraction
            
            # Show samples
            print(f"  Sample attractions:")
            for attr in data[:3]:
                print(f"    - {attr['name']} ({attr['category']})")
            
        except Exception as e:
            print(f"✗ Get attractions test failed: {str(e)}")
            raise


class TestLeaderboard:
    """Test leaderboard endpoint"""
    
    def test_get_leaderboard(self):
        """Test GET /api/leaderboard returns top locations by rating"""
        try:
            response = requests.get(f"{BASE_URL}/api/leaderboard", timeout=10)
            print(f"✓ GET /api/leaderboard status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert isinstance(data, list), "Response should be array"
            print(f"✓ Leaderboard retrieved: {len(data)} locations")
            
            if len(data) > 0:
                # Check structure
                loc = data[0]
                assert "id" in loc
                assert "name" in loc
                assert "category" in loc
                assert "avg_rating" in loc
                assert "review_count" in loc
                
                # Verify sorted by rating (descending)
                ratings = [l["avg_rating"] for l in data]
                assert ratings == sorted(ratings, reverse=True), "Leaderboard should be sorted by rating descending"
                
                print(f"✓ Leaderboard sorted by rating (descending)")
                print(f"  Top location: {data[0]['name']} - {data[0]['avg_rating']}⭐ ({data[0]['review_count']} reviews)")
                
                if len(data) > 1:
                    print(f"  2nd: {data[1]['name']} - {data[1]['avg_rating']}⭐ ({data[1]['review_count']} reviews)")
            else:
                print(f"⚠ No locations with reviews in leaderboard (this is OK if no reviews exist)")
            
        except Exception as e:
            print(f"✗ Get leaderboard test failed: {str(e)}")
            raise
    
    def test_leaderboard_limit_param(self):
        """Test GET /api/leaderboard?limit=3 returns limited results"""
        try:
            response = requests.get(f"{BASE_URL}/api/leaderboard?limit=3", timeout=10)
            print(f"✓ GET /api/leaderboard?limit=3 status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert len(data) <= 3, f"Expected max 3 locations, got {len(data)}"
            
            print(f"✓ Leaderboard limit works: {len(data)} locations returned")
            
        except Exception as e:
            print(f"✗ Leaderboard limit test failed: {str(e)}")
            raise


class TestAdminBusinessAccounts:
    """Test admin business account management endpoints"""
    
    def test_get_business_accounts_without_auth(self):
        """Test GET /api/admin/business-accounts requires auth"""
        try:
            response = requests.get(f"{BASE_URL}/api/admin/business-accounts", timeout=10)
            print(f"✓ GET /api/admin/business-accounts (no auth) status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            
            print(f"✓ Business accounts list requires auth")
            
        except Exception as e:
            print(f"✗ Business accounts no-auth test failed: {str(e)}")
            raise
    
    def test_get_business_accounts_with_auth(self, admin_token):
        """Test GET /api/admin/business-accounts lists business accounts"""
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.get(f"{BASE_URL}/api/admin/business-accounts", headers=headers, timeout=10)
            print(f"✓ GET /api/admin/business-accounts (with auth) status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert isinstance(data, list), "Response should be array"
            print(f"✓ Business accounts retrieved: {len(data)} accounts")
            
            if len(data) > 0:
                # Check structure
                account = data[0]
                assert "id" in account
                assert "email" in account
                assert "name" in account
                assert "location_id" in account
                assert "location_name" in account
                
                print(f"  Sample account: {account['email']} - {account['location_name']}")
            
        except Exception as e:
            print(f"✗ Get business accounts test failed: {str(e)}")
            raise
    
    def test_create_business_account_without_auth(self):
        """Test POST /api/admin/business-accounts requires auth"""
        try:
            payload = {
                "email": "test_biz@example.com",
                "password": "TestPass123",
                "name": "Test Business",
                "location_id": "dummy-id"
            }
            
            response = requests.post(f"{BASE_URL}/api/admin/business-accounts", json=payload, timeout=10)
            print(f"✓ POST /api/admin/business-accounts (no auth) status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            
            print(f"✓ Business account creation requires auth")
            
        except Exception as e:
            print(f"✗ Business account creation no-auth test failed: {str(e)}")
            raise
    
    def test_create_business_account_with_auth(self, admin_token):
        """Test POST /api/admin/business-accounts creates business account"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            
            import time
            timestamp = int(time.time())
            payload = {
                "email": f"test_biz_{timestamp}@example.com",
                "password": "TestPass123",
                "name": "TEST Business Account",
                "location_id": loc_id
            }
            
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.post(f"{BASE_URL}/api/admin/business-accounts", json=payload, headers=headers, timeout=10)
            print(f"✓ POST /api/admin/business-accounts (with auth) status: {response.status_code}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
            
            data = response.json()
            assert "message" in data
            print(f"✓ Business account created: {data['message']}")
            
            # Verify it appears in the list
            list_response = requests.get(f"{BASE_URL}/api/admin/business-accounts", headers=headers, timeout=10)
            accounts = list_response.json()
            created_account = next((a for a in accounts if a["email"] == payload["email"]), None)
            assert created_account is not None, "Created account not found in list"
            print(f"✓ Created account verified in list")
            
        except Exception as e:
            print(f"✗ Create business account test failed: {str(e)}")
            raise
    
    def test_create_business_account_invalid_location(self, admin_token):
        """Test POST /api/admin/business-accounts with invalid location returns 404"""
        try:
            import time
            timestamp = int(time.time())
            payload = {
                "email": f"test_invalid_{timestamp}@example.com",
                "password": "TestPass123",
                "name": "TEST Invalid Location",
                "location_id": "invalid-location-id-12345"
            }
            
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.post(f"{BASE_URL}/api/admin/business-accounts", json=payload, headers=headers, timeout=10)
            print(f"✓ POST /api/admin/business-accounts (invalid location) status: {response.status_code}")
            assert response.status_code == 404, "Expected 404 for invalid location"
            
            print(f"✓ Invalid location rejected with 404")
            
        except Exception as e:
            print(f"✗ Invalid location business account test failed: {str(e)}")
            raise
