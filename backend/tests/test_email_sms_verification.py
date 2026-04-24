"""
Tests for Email/SMS verification integration:
- POST /api/reservations: fallback mode (no Twilio/Resend) returns show_code=true + verification_code
- POST /api/reservations: response structure validation (show_code, verification_code, sent_via)
- GET /api/admin/site-settings: includes Resend/Twilio integration keys
- PUT /api/admin/site-settings: saves Resend/Twilio keys to DB
- GET /api/admin/site-settings after save: verifies saved data persists
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_BACKEND_URL', '').rstrip('/')


@pytest.fixture
def api_client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture
def admin_token(api_client):
    """Login as admin and return auth token"""
    res = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@gradacac.ba",
        "password": "Gradacac2024!"
    })
    if res.status_code != 200:
        pytest.skip(f"Admin login failed: {res.status_code} - {res.text}")
    return res.json().get("token")


@pytest.fixture
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def first_reservable_location(api_client):
    """Return the first reservable location ID"""
    res = api_client.get(f"{BASE_URL}/api/reservations/locations")
    assert res.status_code == 200
    data = res.json()
    if not data:
        pytest.skip("No reservable locations available")
    return data[0]


# ===== Fallback Mode Tests =====
class TestReservationFallbackMode:
    """Tests for POST /api/reservations when no SMS/Email service is configured"""

    def test_create_reservation_returns_200(self, api_client, first_reservable_location):
        """Basic reservation creation should succeed"""
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": first_reservable_location["id"],
            "customer_name": "TEST_FallbackUser",
            "customer_phone": "061111000",
            "date": "2026-07-15",
            "time": "18:00",
            "guests": 2
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_create_reservation_returns_reservation_id(self, api_client, first_reservable_location):
        """Response must include reservation_id"""
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": first_reservable_location["id"],
            "customer_name": "TEST_FallbackCheck",
            "customer_phone": "061111001",
            "date": "2026-07-15",
            "time": "19:00",
            "guests": 2
        })
        assert res.status_code == 200
        data = res.json()
        assert "reservation_id" in data, f"Missing reservation_id in response: {data}"
        assert data["reservation_id"], "reservation_id should not be empty"

    def test_create_reservation_fallback_show_code_true(self, api_client, first_reservable_location):
        """When Twilio/Resend not configured, show_code must be True (fallback mode)"""
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": first_reservable_location["id"],
            "customer_name": "TEST_ShowCodeTrue",
            "customer_phone": "061111002",
            "date": "2026-07-16",
            "time": "12:00",
            "guests": 2
        })
        assert res.status_code == 200
        data = res.json()
        assert "show_code" in data, f"Missing show_code field in response: {data}"
        # In fallback mode (no services configured), show_code must be True
        assert data["show_code"] == True, f"Expected show_code=True in fallback mode, got: {data['show_code']}"

    def test_create_reservation_fallback_returns_verification_code(self, api_client, first_reservable_location):
        """When show_code=True (fallback), verification_code must be a 6-digit number"""
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": first_reservable_location["id"],
            "customer_name": "TEST_VerifCode6",
            "customer_phone": "061111003",
            "date": "2026-07-16",
            "time": "13:00",
            "guests": 1
        })
        assert res.status_code == 200
        data = res.json()
        code = data.get("verification_code")
        assert code is not None, f"verification_code should be present in fallback mode: {data}"
        assert str(code).isdigit(), f"verification_code should be numeric, got: {code}"
        assert len(str(code)) == 6, f"verification_code should be 6 digits, got: {code}"

    def test_create_reservation_fallback_sent_via_is_null(self, api_client, first_reservable_location):
        """In fallback mode (no services), sent_via must be None/null"""
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": first_reservable_location["id"],
            "customer_name": "TEST_SentViaNull",
            "customer_phone": "061111004",
            "date": "2026-07-17",
            "time": "14:00",
            "guests": 2
        })
        assert res.status_code == 200
        data = res.json()
        assert "sent_via" in data, f"Missing sent_via field: {data}"
        assert data["sent_via"] is None, f"Expected sent_via=None in fallback mode, got: {data['sent_via']}"

    def test_create_reservation_response_has_message(self, api_client, first_reservable_location):
        """Response must include a message field"""
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": first_reservable_location["id"],
            "customer_name": "TEST_MsgField",
            "customer_phone": "061111005",
            "date": "2026-07-17",
            "time": "15:00",
            "guests": 2
        })
        assert res.status_code == 200
        data = res.json()
        assert "message" in data, f"Missing message field: {data}"

    def test_verification_code_can_be_used_to_verify(self, api_client, first_reservable_location):
        """Code returned in fallback mode should be usable to verify the reservation"""
        # Create reservation
        create_res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": first_reservable_location["id"],
            "customer_name": "TEST_VerifyFallback",
            "customer_phone": "061111006",
            "date": "2026-07-18",
            "time": "16:00",
            "guests": 2
        })
        assert create_res.status_code == 200
        data = create_res.json()
        assert data["show_code"] == True
        code = data["verification_code"]
        reservation_id = data["reservation_id"]

        # Verify with returned code
        verify_res = api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": reservation_id,
            "code": str(code)
        })
        assert verify_res.status_code == 200, f"Fallback code verification failed: {verify_res.status_code}: {verify_res.text}"


# ===== Site Settings Integration Tests =====
class TestSiteSettingsIntegrations:
    """Test GET/PUT /api/admin/site-settings for Resend and Twilio keys"""

    def test_get_site_settings_admin_200(self, api_client, admin_headers):
        """Admin can fetch site settings"""
        res = api_client.get(f"{BASE_URL}/api/admin/site-settings", headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_get_site_settings_returns_dict(self, api_client, admin_headers):
        """Site settings response should be a dict"""
        res = api_client.get(f"{BASE_URL}/api/admin/site-settings", headers=admin_headers)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, dict), f"Expected dict, got: {type(data)}"

    def test_get_site_settings_unauthorized(self, api_client):
        """Non-admin cannot access admin site settings"""
        res = api_client.get(f"{BASE_URL}/api/admin/site-settings")
        assert res.status_code == 401, f"Expected 401, got {res.status_code}"

    def test_save_resend_api_key(self, api_client, admin_headers):
        """PUT /api/admin/site-settings should save Resend API key"""
        payload = {
            "resend_api_key": "TEST_re_testkey123",
            "resend_sender_email": "test@gradacac-mapa.ba"
        }
        res = api_client.put(f"{BASE_URL}/api/admin/site-settings", json=payload, headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_resend_key_persisted_in_db(self, api_client, admin_headers):
        """After saving Resend key, GET should return it"""
        test_key = "TEST_re_persistcheck999"
        api_client.put(
            f"{BASE_URL}/api/admin/site-settings",
            json={"resend_api_key": test_key},
            headers=admin_headers
        )
        get_res = api_client.get(f"{BASE_URL}/api/admin/site-settings", headers=admin_headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data.get("resend_api_key") == test_key, \
            f"Expected resend_api_key='{test_key}', got: {data.get('resend_api_key')}"

    def test_save_twilio_keys(self, api_client, admin_headers):
        """PUT /api/admin/site-settings should save all Twilio credentials"""
        payload = {
            "twilio_account_sid": "TEST_ACxxxxxxxxxxxxxxxx",
            "twilio_auth_token": "TEST_authtoken123",
            "twilio_from_number": "+12345678901"
        }
        res = api_client.put(f"{BASE_URL}/api/admin/site-settings", json=payload, headers=admin_headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_twilio_keys_persisted_in_db(self, api_client, admin_headers):
        """After saving Twilio keys, GET should return them"""
        test_sid = "TEST_ACtwilio_persistcheck"
        test_token = "TEST_authtoken_persistcheck"
        test_number = "+38761000111"
        api_client.put(
            f"{BASE_URL}/api/admin/site-settings",
            json={
                "twilio_account_sid": test_sid,
                "twilio_auth_token": test_token,
                "twilio_from_number": test_number
            },
            headers=admin_headers
        )
        get_res = api_client.get(f"{BASE_URL}/api/admin/site-settings", headers=admin_headers)
        assert get_res.status_code == 200
        data = get_res.json()
        assert data.get("twilio_account_sid") == test_sid, \
            f"twilio_account_sid not persisted: {data.get('twilio_account_sid')}"
        assert data.get("twilio_auth_token") == test_token, \
            f"twilio_auth_token not persisted: {data.get('twilio_auth_token')}"
        assert data.get("twilio_from_number") == test_number, \
            f"twilio_from_number not persisted: {data.get('twilio_from_number')}"

    def test_site_settings_put_returns_ok(self, api_client, admin_headers):
        """PUT /api/admin/site-settings response includes ok: true"""
        res = api_client.put(
            f"{BASE_URL}/api/admin/site-settings",
            json={"resend_sender_email": "noreply@gradacac-mapa.ba"},
            headers=admin_headers
        )
        assert res.status_code == 200
        data = res.json()
        assert data.get("ok") == True, f"Expected ok=True, got: {data}"

    def teardown_method(self, method):
        """Clean up test keys after tests - reset to empty"""
        try:
            session = requests.Session()
            login_res = session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "admin@gradacac.ba",
                "password": "Gradacac2024!"
            })
            if login_res.status_code == 200:
                token = login_res.json().get("token")
                headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {token}"
                }
                # Clear test Twilio/Resend keys
                session.put(
                    f"{BASE_URL}/api/admin/site-settings",
                    json={
                        "resend_api_key": "",
                        "twilio_account_sid": "",
                        "twilio_auth_token": "",
                        "twilio_from_number": ""
                    },
                    headers=headers
                )
        except Exception:
            pass
