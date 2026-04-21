"""
Test suite for new UI features:
- Chat/messages on location detail page
- Menu display on location detail page
- Offers display on location detail page
- Business accounts management in admin panel
- Analytics tracking (views, nav_clicks, call_clicks)
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://gradacac-map.preview.emergentagent.com').rstrip('/')

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
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]

@pytest.fixture
def test_location_id(api_client):
    """Get a test location ID"""
    response = api_client.get(f"{BASE_URL}/api/locations")
    assert response.status_code == 200
    locations = response.json()
    assert len(locations) > 0, "No locations found"
    return locations[0]["id"]

class TestChatMessages:
    """Test chat/messages functionality on location detail page"""
    
    def test_send_message_to_location(self, api_client, test_location_id):
        """Test POST /api/locations/{id}/messages - Send message to location"""
        response = api_client.post(f"{BASE_URL}/api/locations/{test_location_id}/messages", json={
            "sender_name": "TEST_Chat_User",
            "message": "Imate li dostupne termine za sutra?"
        })
        assert response.status_code == 200, f"Failed to send message: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["location_id"] == test_location_id
        assert data["sender_name"] == "TEST_Chat_User"
        assert data["message"] == "Imate li dostupne termine za sutra?"
        assert data["reply"] is None
        assert "created_at" in data
        print(f"✓ Message sent successfully: {data['id']}")
    
    def test_send_message_invalid_location(self, api_client):
        """Test sending message to invalid location returns 404"""
        response = api_client.post(f"{BASE_URL}/api/locations/invalid-id/messages", json={
            "sender_name": "Test User",
            "message": "Test message"
        })
        assert response.status_code == 404
        print("✓ Invalid location returns 404")
    
    def test_get_location_messages(self, api_client, test_location_id):
        """Test GET /api/locations/{id}/messages - Get messages for location"""
        # First send a message
        api_client.post(f"{BASE_URL}/api/locations/{test_location_id}/messages", json={
            "sender_name": "TEST_Get_Messages",
            "message": "Test message for retrieval"
        })
        
        # Get messages
        response = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}/messages")
        assert response.status_code == 200
        
        messages = response.json()
        assert isinstance(messages, list)
        # Should have at least the message we just sent
        assert len(messages) > 0
        
        # Check message structure
        msg = messages[0]
        assert "id" in msg
        assert "location_id" in msg
        assert "sender_name" in msg
        assert "message" in msg
        assert "created_at" in msg
        print(f"✓ Retrieved {len(messages)} messages")

class TestMenuItems:
    """Test menu items functionality on location detail page"""
    
    def test_get_location_menu_empty(self, api_client, test_location_id):
        """Test GET /api/locations/{id}/menu - Returns empty array if no menu"""
        response = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}/menu")
        assert response.status_code == 200
        
        menu = response.json()
        assert isinstance(menu, list)
        print(f"✓ Menu endpoint returns array (length: {len(menu)})")
    
    def test_create_menu_item_as_admin(self, api_client, admin_token, test_location_id):
        """Test POST /api/business/menu - Create menu item as admin"""
        response = api_client.post(
            f"{BASE_URL}/api/business/menu?lid={test_location_id}",
            json={
                "name": "TEST_Ćevapi",
                "price": 8.50,
                "description": "10 ćevapa sa lukom i lepinjom",
                "category": "Glavna jela"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create menu item: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["location_id"] == test_location_id
        assert data["name"] == "TEST_Ćevapi"
        assert data["price"] == 8.50
        assert data["category"] == "Glavna jela"
        print(f"✓ Menu item created: {data['id']}")
        
        # Verify it appears in menu
        menu_response = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}/menu")
        menu = menu_response.json()
        assert any(item["name"] == "TEST_Ćevapi" for item in menu)
        print("✓ Menu item appears in location menu")

class TestOffers:
    """Test offers display on location detail page"""
    
    def test_get_location_offers(self, api_client, test_location_id):
        """Test GET /api/locations/{id}/offers - Get active offers for location"""
        response = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}/offers")
        assert response.status_code == 200
        
        offers = response.json()
        assert isinstance(offers, list)
        print(f"✓ Offers endpoint returns array (length: {len(offers)})")
    
    def test_create_offer_as_admin(self, api_client, admin_token, test_location_id):
        """Test POST /api/business/offers - Create offer as admin"""
        response = api_client.post(
            f"{BASE_URL}/api/business/offers",
            json={
                "location_id": test_location_id,
                "title": "TEST_Popust 20%",
                "description": "20% popust na sve artikle",
                "discount_percent": 20
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create offer: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["location_id"] == test_location_id
        assert data["title"] == "TEST_Popust 20%"
        assert data["discount_percent"] == 20
        assert data["is_active"] is True
        print(f"✓ Offer created: {data['id']}")
        
        # Verify it appears in location offers
        offers_response = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}/offers")
        offers = offers_response.json()
        assert any(offer["title"] == "TEST_Popust 20%" for offer in offers)
        print("✓ Offer appears in location offers")

class TestBusinessAccounts:
    """Test business accounts management in admin panel"""
    
    def test_get_business_accounts_without_auth(self, api_client):
        """Test GET /api/admin/business-accounts requires authentication"""
        response = api_client.get(f"{BASE_URL}/api/admin/business-accounts")
        assert response.status_code == 401
        print("✓ Business accounts endpoint requires auth")
    
    def test_get_business_accounts_with_auth(self, api_client, admin_token):
        """Test GET /api/admin/business-accounts - List business accounts"""
        response = api_client.get(
            f"{BASE_URL}/api/admin/business-accounts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        
        accounts = response.json()
        assert isinstance(accounts, list)
        
        # Check structure if accounts exist
        if len(accounts) > 0:
            acc = accounts[0]
            assert "id" in acc
            assert "email" in acc
            assert "name" in acc
            assert "location_id" in acc
            assert "location_name" in acc
        
        print(f"✓ Retrieved {len(accounts)} business accounts")
    
    def test_create_business_account(self, api_client, admin_token, test_location_id):
        """Test POST /api/admin/business-accounts - Create business account"""
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        response = api_client.post(
            f"{BASE_URL}/api/admin/business-accounts",
            json={
                "email": f"test_biz_{timestamp}@example.com",
                "password": "TestPass123!",
                "name": f"TEST_Business_{timestamp}",
                "location_id": test_location_id
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create business account: {response.text}"
        
        data = response.json()
        assert "message" in data
        assert f"test_biz_{timestamp}@example.com" in data["message"]
        print(f"✓ Business account created: {data['message']}")
        
        # Verify it appears in list
        list_response = api_client.get(
            f"{BASE_URL}/api/admin/business-accounts",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        accounts = list_response.json()
        assert any(acc["email"] == f"test_biz_{timestamp}@example.com" for acc in accounts)
        print("✓ Business account appears in list")
    
    def test_create_business_account_invalid_location(self, api_client, admin_token):
        """Test creating business account with invalid location returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/admin/business-accounts",
            json={
                "email": "test_invalid@example.com",
                "password": "TestPass123!",
                "name": "Test Invalid",
                "location_id": "invalid-location-id"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 404
        print("✓ Invalid location returns 404")

class TestAnalyticsTracking:
    """Test analytics tracking for views, nav_clicks, call_clicks"""
    
    def test_location_view_tracking(self, api_client, test_location_id):
        """Test GET /api/locations/{id} increments views counter"""
        # Get initial views count
        response1 = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}")
        assert response1.status_code == 200
        initial_views = response1.json().get("views", 0)
        
        # View location again
        response2 = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}")
        assert response2.status_code == 200
        new_views = response2.json().get("views", 0)
        
        # Views should have incremented
        assert new_views > initial_views
        print(f"✓ Views tracked: {initial_views} → {new_views}")
    
    def test_nav_clicks_tracking(self, api_client, test_location_id):
        """Test POST /api/locations/{id}/track/nav_clicks"""
        # Get initial count
        response1 = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}")
        initial_nav = response1.json().get("nav_clicks", 0)
        
        # Track nav click
        track_response = api_client.post(f"{BASE_URL}/api/locations/{test_location_id}/track/nav_clicks")
        assert track_response.status_code == 200
        
        # Verify increment
        response2 = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}")
        new_nav = response2.json().get("nav_clicks", 0)
        
        assert new_nav > initial_nav
        print(f"✓ Nav clicks tracked: {initial_nav} → {new_nav}")
    
    def test_call_clicks_tracking(self, api_client, test_location_id):
        """Test POST /api/locations/{id}/track/call_clicks"""
        # Get initial count
        response1 = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}")
        initial_call = response1.json().get("call_clicks", 0)
        
        # Track call click
        track_response = api_client.post(f"{BASE_URL}/api/locations/{test_location_id}/track/call_clicks")
        assert track_response.status_code == 200
        
        # Verify increment
        response2 = api_client.get(f"{BASE_URL}/api/locations/{test_location_id}")
        new_call = response2.json().get("call_clicks", 0)
        
        assert new_call > initial_call
        print(f"✓ Call clicks tracked: {initial_call} → {new_call}")
    
    def test_invalid_tracking_action(self, api_client, test_location_id):
        """Test tracking invalid action returns 400"""
        response = api_client.post(f"{BASE_URL}/api/locations/{test_location_id}/track/invalid_action")
        assert response.status_code == 400
        print("✓ Invalid tracking action returns 400")
