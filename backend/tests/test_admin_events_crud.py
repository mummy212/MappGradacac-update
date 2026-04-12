"""
Backend tests for Admin Events CRUD feature
Tests POST /api/admin/events, DELETE /api/admin/events/{id}, GET /api/events
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL').rstrip('/')

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

class TestAdminEventsAuth:
    """Test authentication requirements for admin events endpoints"""
    
    def test_create_event_without_auth_fails(self, api_client):
        """POST /api/admin/events without auth should return 401"""
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        response = api_client.post(f"{BASE_URL}/api/admin/events", json={
            "title": "Test Event",
            "description": "Test description",
            "location_name": "Test Location",
            "date": tomorrow,
            "time": "18:00"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ POST /api/admin/events without auth returns 401")
    
    def test_delete_event_without_auth_fails(self, api_client):
        """DELETE /api/admin/events/{id} without auth should return 401"""
        response = api_client.delete(f"{BASE_URL}/api/admin/events/fake-id")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ DELETE /api/admin/events/{id} without auth returns 401")

class TestAdminEventsCRUD:
    """Test CRUD operations for admin events"""
    
    def test_create_event_and_verify_persistence(self, api_client, admin_token):
        """POST /api/admin/events creates event and GET /api/events shows it"""
        # Create event
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        create_payload = {
            "title": "TEST_Dani Šljive 2026",
            "description": "Tradicionalna manifestacija u Gradačcu",
            "location_name": "Centar grada",
            "date": tomorrow,
            "time": "18:00"
        }
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/events",
            json=create_payload,
            headers=headers
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        created_event = create_response.json()
        assert "id" in created_event, "Response should have id"
        assert created_event["title"] == create_payload["title"]
        assert created_event["description"] == create_payload["description"]
        assert created_event["location_name"] == create_payload["location_name"]
        assert created_event["date"] == create_payload["date"]
        assert created_event["time"] == create_payload["time"]
        
        event_id = created_event["id"]
        print(f"✓ POST /api/admin/events created event with id: {event_id}")
        
        # Verify event appears in GET /api/events
        get_response = api_client.get(f"{BASE_URL}/api/events")
        assert get_response.status_code == 200, f"GET failed: {get_response.text}"
        
        events = get_response.json()
        assert isinstance(events, list), "Response should be a list"
        
        # Find our test event
        test_event = next((e for e in events if e["id"] == event_id), None)
        assert test_event is not None, f"Created event {event_id} not found in GET /api/events"
        assert test_event["title"] == create_payload["title"]
        assert test_event["description"] == create_payload["description"]
        assert test_event["location_name"] == create_payload["location_name"]
        assert test_event["date"] == create_payload["date"]
        assert test_event["time"] == create_payload["time"]
        
        print(f"✓ GET /api/events shows created event with correct data")
        
        # Cleanup - delete the test event
        delete_response = api_client.delete(
            f"{BASE_URL}/api/admin/events/{event_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Cleanup delete failed: {delete_response.text}"
        print(f"✓ Cleanup: Deleted test event {event_id}")
    
    def test_delete_event_removes_from_list(self, api_client, admin_token):
        """DELETE /api/admin/events/{id} removes event from GET /api/events"""
        # Create event
        tomorrow = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        create_payload = {
            "title": "TEST_Delete_Event",
            "description": "Event to be deleted",
            "location_name": "Test Location",
            "date": tomorrow,
            "time": "20:00"
        }
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/events",
            json=create_payload,
            headers=headers
        )
        assert create_response.status_code == 200
        event_id = create_response.json()["id"]
        print(f"✓ Created test event {event_id} for deletion test")
        
        # Verify event exists
        get_before = api_client.get(f"{BASE_URL}/api/events")
        events_before = get_before.json()
        assert any(e["id"] == event_id for e in events_before), "Event should exist before deletion"
        
        # Delete event
        delete_response = api_client.delete(
            f"{BASE_URL}/api/admin/events/{event_id}",
            headers=headers
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"✓ DELETE /api/admin/events/{event_id} returned 200")
        
        # Verify event is removed
        get_after = api_client.get(f"{BASE_URL}/api/events")
        events_after = get_after.json()
        assert not any(e["id"] == event_id for e in events_after), "Event should not exist after deletion"
        print(f"✓ Event {event_id} removed from GET /api/events after deletion")
    
    def test_get_events_returns_only_upcoming(self, api_client, admin_token):
        """GET /api/events returns only events with date >= today"""
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        events = response.json()
        assert isinstance(events, list), "Response should be a list"
        
        today = datetime.now().strftime("%Y-%m-%d")
        for event in events:
            assert "date" in event, "Event should have date field"
            assert event["date"] >= today, f"Event date {event['date']} should be >= today {today}"
        
        print(f"✓ GET /api/events returns {len(events)} upcoming events (all dates >= today)")
    
    def test_event_structure_validation(self, api_client, admin_token):
        """Verify event response has all required fields"""
        # Create event with all fields
        tomorrow = (datetime.now() + timedelta(days=3)).strftime("%Y-%m-%d")
        create_payload = {
            "title": "TEST_Structure_Check",
            "description": "Full event with all fields",
            "location_name": "Test Venue",
            "date": tomorrow,
            "time": "19:30"
        }
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/events",
            json=create_payload,
            headers=headers
        )
        assert create_response.status_code == 200
        
        event = create_response.json()
        
        # Verify all required fields
        assert "id" in event and isinstance(event["id"], str)
        assert "title" in event and isinstance(event["title"], str)
        assert "description" in event and isinstance(event["description"], str)
        assert "location_name" in event and isinstance(event["location_name"], str)
        assert "date" in event and isinstance(event["date"], str)
        assert "time" in event and isinstance(event["time"], str)
        assert "created_at" in event
        
        print("✓ Event response has all required fields with correct types")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/events/{event['id']}", headers=headers)
    
    def test_create_event_without_time_optional(self, api_client, admin_token):
        """POST /api/admin/events works without time field (optional)"""
        tomorrow = (datetime.now() + timedelta(days=4)).strftime("%Y-%m-%d")
        create_payload = {
            "title": "TEST_No_Time",
            "description": "Event without specific time",
            "location_name": "Test Location",
            "date": tomorrow
        }
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        create_response = api_client.post(
            f"{BASE_URL}/api/admin/events",
            json=create_payload,
            headers=headers
        )
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        event = create_response.json()
        assert event["title"] == create_payload["title"]
        assert event["time"] is None or event["time"] == ""
        
        print("✓ POST /api/admin/events works without time field (optional)")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/admin/events/{event['id']}", headers=headers)

class TestEventsPublicEndpoint:
    """Test public GET /api/events endpoint"""
    
    def test_get_events_public_access(self, api_client):
        """GET /api/events is accessible without authentication"""
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200, f"GET failed: {response.text}"
        
        events = response.json()
        assert isinstance(events, list), "Response should be a list"
        
        print(f"✓ GET /api/events is public (no auth required), returned {len(events)} events")
    
    def test_events_sorted_by_date(self, api_client):
        """GET /api/events returns events sorted by date ascending"""
        response = api_client.get(f"{BASE_URL}/api/events")
        assert response.status_code == 200
        
        events = response.json()
        if len(events) > 1:
            dates = [e["date"] for e in events]
            assert dates == sorted(dates), "Events should be sorted by date ascending"
            print(f"✓ Events sorted by date ascending: {dates[:3]}...")
        else:
            print(f"✓ Only {len(events)} event(s), sorting not testable")
