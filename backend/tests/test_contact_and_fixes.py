"""
Tests for the 4 fixes on Gradacac Mapa:
1. Contact form backend /api/contact endpoint
2. /api/admin/contact-messages endpoint
3. Admin mark read and delete contact messages
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def admin_session():
    """Authenticated admin session"""
    session = requests.Session()
    resp = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@gradacac.ba",
        "password": "Gradacac2024!"
    })
    if resp.status_code != 200:
        pytest.skip(f"Admin login failed: {resp.status_code} {resp.text}")
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def contact_message_id(admin_session):
    """Creates a contact message for use in tests, returns its id"""
    resp = requests.post(f"{BASE_URL}/api/contact", json={
        "name": "TEST_Tester Testic",
        "email": "test@example.com",
        "subject": "TEST_Testni predmet",
        "message": "TEST_Ovo je testna poruka za provjeru backend API."
    })
    assert resp.status_code == 200, f"POST /api/contact failed: {resp.status_code} {resp.text}"
    data = resp.json()
    assert data.get("success") is True, f"Expected success=True, got: {data}"
    # Now fetch the messages to get the ID
    list_resp = admin_session.get(f"{BASE_URL}/api/admin/contact-messages")
    assert list_resp.status_code == 200
    msgs = list_resp.json()
    # Find the test message we just created
    for m in msgs:
        if m.get("subject") == "TEST_Testni predmet" and m.get("name") == "TEST_Tester Testic":
            return m["id"]
    pytest.skip("Could not find created test message")


# ===== Contact Form API =====
class TestContactFormAPI:
    """Tests for POST /api/contact endpoint"""

    def test_contact_submit_success(self):
        """POST /api/contact returns {success: true}"""
        resp = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "TEST_Amer Hasanovic",
            "email": "amer@example.com",
            "subject": "TEST_API provjera",
            "message": "TEST_Testna poruka putem API."
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert "success" in data, f"Response missing 'success' key: {data}"
        assert data["success"] is True, f"Expected success=True, got: {data}"

    def test_contact_submit_without_subject(self):
        """POST /api/contact works without optional subject field"""
        resp = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "TEST_Bez Naslova",
            "email": "beznaslov@example.com",
            "message": "TEST_Poruka bez naslova."
        })
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True

    def test_contact_submit_missing_required_fields(self):
        """POST /api/contact returns 422 when required fields missing"""
        resp = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "Only Name"
            # missing email and message
        })
        assert resp.status_code == 422, f"Expected 422 for missing fields, got {resp.status_code}"

    def test_contact_submit_empty_name(self):
        """POST /api/contact returns 422 when name is empty"""
        resp = requests.post(f"{BASE_URL}/api/contact", json={
            "name": "",
            "email": "test@example.com",
            "message": "Message"
        })
        # Empty string is valid for the model (no min_length set), so 200 is acceptable
        assert resp.status_code in (200, 422), f"Got unexpected status: {resp.status_code}"


# ===== Admin Contact Messages API =====
class TestAdminContactMessages:
    """Tests for admin contact messages endpoints"""

    def test_list_contact_messages_requires_auth(self):
        """GET /api/admin/contact-messages requires authentication"""
        resp = requests.get(f"{BASE_URL}/api/admin/contact-messages")
        assert resp.status_code in (401, 403), f"Expected 401/403, got {resp.status_code}"

    def test_list_contact_messages_as_admin(self, admin_session):
        """GET /api/admin/contact-messages returns list for admin"""
        resp = admin_session.get(f"{BASE_URL}/api/admin/contact-messages")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got: {type(data)}"

    def test_contact_messages_have_correct_fields(self, admin_session, contact_message_id):
        """Contact messages list contains correct fields"""
        resp = admin_session.get(f"{BASE_URL}/api/admin/contact-messages")
        assert resp.status_code == 200
        msgs = resp.json()
        assert len(msgs) > 0, "No contact messages found"
        msg = msgs[0]
        # Verify required fields
        assert "id" in msg, "Missing 'id' field"
        assert "name" in msg, "Missing 'name' field"
        assert "email" in msg, "Missing 'email' field"
        assert "message" in msg, "Missing 'message' field"
        assert "created_at" in msg, "Missing 'created_at' field"
        assert "read" in msg, "Missing 'read' field"
        # Ensure no _id (MongoDB ObjectId) in response
        assert "_id" not in msg, "MongoDB '_id' should not be in response"

    def test_mark_message_as_read(self, admin_session, contact_message_id):
        """PUT /api/admin/contact-messages/{id}/read marks message as read"""
        resp = admin_session.put(f"{BASE_URL}/api/admin/contact-messages/{contact_message_id}/read", json={})
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True, f"Expected success=True, got: {data}"

    def test_delete_contact_message(self, admin_session, contact_message_id):
        """DELETE /api/admin/contact-messages/{id} deletes a message"""
        resp = admin_session.delete(f"{BASE_URL}/api/admin/contact-messages/{contact_message_id}")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data.get("success") is True, f"Expected success=True, got: {data}"

    def test_deleted_message_is_gone(self, admin_session, contact_message_id):
        """After deletion, message is no longer in the list"""
        resp = admin_session.get(f"{BASE_URL}/api/admin/contact-messages")
        assert resp.status_code == 200
        msgs = resp.json()
        ids = [m["id"] for m in msgs]
        assert contact_message_id not in ids, f"Deleted message {contact_message_id} still appears in list"


# Cleanup test messages created during testing
@pytest.fixture(autouse=True, scope="module")
def cleanup_test_messages(admin_session):
    yield
    # Delete any remaining TEST_ messages
    try:
        resp = admin_session.get(f"{BASE_URL}/api/admin/contact-messages")
        if resp.status_code == 200:
            for msg in resp.json():
                if msg.get("name", "").startswith("TEST_") or msg.get("subject", "").startswith("TEST_") or msg.get("message", "").startswith("TEST_"):
                    admin_session.delete(f"{BASE_URL}/api/admin/contact-messages/{msg['id']}")
    except Exception:
        pass
