"""
Tests for the reservation system:
- GET /api/reservations/locations
- POST /api/reservations (create with verification code)
- POST /api/reservations/verify (verify with 6-digit code)
- GET /api/my-reservations?phone=xxx
- GET /api/business/reservations (business auth required)
- PUT /api/business/reservations/{id}/status (business auth required)
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
def business_token(api_client):
    """Login as business user and return token"""
    res = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "starigrad@test.ba",
        "password": "Test1234!"
    })
    if res.status_code != 200:
        pytest.skip(f"Business login failed: {res.status_code} - {res.text}")
    return res.json().get("token")


class TestReservationsLocations:
    """Test GET /api/reservations/locations"""

    def test_get_locations_returns_200(self, api_client):
        res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_get_locations_returns_list(self, api_client):
        res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_locations_only_reservable_categories(self, api_client):
        """Only restaurant, cafe, prenociste categories should be returned"""
        res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        assert res.status_code == 200
        data = res.json()
        allowed_categories = {"restaurant", "cafe", "prenociste"}
        for loc in data:
            assert loc.get("category") in allowed_categories, \
                f"Non-reservable category found: {loc.get('category')} for {loc.get('name')}"

    def test_locations_have_required_fields(self, api_client):
        """Each location must have id, name, category, address"""
        res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        assert res.status_code == 200
        data = res.json()
        if len(data) == 0:
            pytest.skip("No locations to check fields")
        for loc in data[:3]:
            assert "id" in loc, f"Missing id in location: {loc}"
            assert "name" in loc, f"Missing name in location: {loc}"
            assert "category" in loc, f"Missing category in location: {loc}"
            assert "address" in loc, f"Missing address in location: {loc}"

    def test_prenociste_locations_present(self, api_client):
        """Prenociste locations should be seeded"""
        res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        assert res.status_code == 200
        data = res.json()
        prenocista = [l for l in data if l.get("category") == "prenociste"]
        assert len(prenocista) > 0, "No prenociste locations found - check seeding"

    def test_restaurant_locations_present(self, api_client):
        """Restaurant locations should be seeded"""
        res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        assert res.status_code == 200
        data = res.json()
        restaurants = [l for l in data if l.get("category") == "restaurant"]
        assert len(restaurants) > 0, "No restaurant locations found"


class TestCreateReservation:
    """Test POST /api/reservations"""

    def get_first_reservable_location_id(self, api_client):
        res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        data = res.json()
        if not data:
            pytest.skip("No reservable locations available")
        return data[0]["id"]

    def test_create_reservation_success(self, api_client):
        loc_id = self.get_first_reservable_location_id(api_client)
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": loc_id,
            "customer_name": "TEST_TestUser",
            "customer_phone": "061999888",
            "date": "2026-06-15",
            "time": "12:00",
            "guests": 2
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_create_reservation_returns_code(self, api_client):
        loc_id = self.get_first_reservable_location_id(api_client)
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": loc_id,
            "customer_name": "TEST_CodeCheck",
            "customer_phone": "061999777",
            "date": "2026-06-16",
            "time": "13:00",
            "guests": 3
        })
        assert res.status_code == 200
        data = res.json()
        assert "verification_code" in data, f"Missing verification_code: {data}"
        assert "reservation_id" in data, f"Missing reservation_id: {data}"
        # Code should be 6 digits
        code = data["verification_code"]
        assert len(str(code)) == 6, f"Code should be 6 digits, got: {code}"
        assert str(code).isdigit(), f"Code should be numeric, got: {code}"

    def test_create_reservation_invalid_location(self, api_client):
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": "non-existent-id-12345",
            "customer_name": "TEST_Invalid",
            "customer_phone": "061999666",
            "date": "2026-06-17",
            "time": "14:00",
            "guests": 1
        })
        assert res.status_code == 404, f"Expected 404 for invalid location, got {res.status_code}"

    def test_create_reservation_non_reservable_category(self, api_client):
        """Market locations should not accept reservations"""
        locs_res = api_client.get(f"{BASE_URL}/api/locations?category=market")
        locs = locs_res.json()
        if not locs:
            pytest.skip("No market locations to test")
        market_id = locs[0]["id"]
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": market_id,
            "customer_name": "TEST_MarketTest",
            "customer_phone": "061999555",
            "date": "2026-06-18",
            "time": "10:00",
            "guests": 2
        })
        assert res.status_code == 400, f"Expected 400 for market (non-reservable), got {res.status_code}"


class TestVerifyReservation:
    """Test POST /api/reservations/verify"""

    def create_test_reservation(self, api_client):
        locs_res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        locs = locs_res.json()
        if not locs:
            pytest.skip("No reservable locations")
        loc_id = locs[0]["id"]
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": loc_id,
            "customer_name": "TEST_VerifyUser",
            "customer_phone": "061111222",
            "date": "2026-07-01",
            "time": "19:00",
            "guests": 2
        })
        assert res.status_code == 200
        return res.json()

    def test_verify_with_correct_code(self, api_client):
        data = self.create_test_reservation(api_client)
        reservation_id = data["reservation_id"]
        code = data["verification_code"]

        res = api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": reservation_id,
            "code": code
        })
        assert res.status_code == 200, f"Expected 200 for correct code, got {res.status_code}: {res.text}"

    def test_verify_with_wrong_code(self, api_client):
        data = self.create_test_reservation(api_client)
        reservation_id = data["reservation_id"]

        res = api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": reservation_id,
            "code": "000000"
        })
        assert res.status_code == 400, f"Expected 400 for wrong code, got {res.status_code}"

    def test_verify_nonexistent_reservation(self, api_client):
        res = api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": "non-existent-id",
            "code": "123456"
        })
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"

    def test_double_verify_rejected(self, api_client):
        """After successful verification, same code shouldn't work again"""
        data = self.create_test_reservation(api_client)
        reservation_id = data["reservation_id"]
        code = data["verification_code"]
        # First verify
        api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": reservation_id, "code": code
        })
        # Second verify should fail
        res = api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": reservation_id, "code": code
        })
        assert res.status_code == 400, f"Expected 400 for double verify, got {res.status_code}"


class TestMyReservations:
    """Test GET /api/my-reservations"""

    def test_get_my_reservations_by_phone(self, api_client):
        # First create and verify a reservation
        locs_res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        locs = locs_res.json()
        if not locs:
            pytest.skip("No reservable locations")
        loc_id = locs[0]["id"]

        create_res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": loc_id,
            "customer_name": "TEST_MyResUser",
            "customer_phone": "061333444",
            "date": "2026-08-01",
            "time": "18:00",
            "guests": 2
        })
        assert create_res.status_code == 200
        data = create_res.json()
        # Verify it so it shows in my-reservations
        api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": data["reservation_id"],
            "code": data["verification_code"]
        })
        # Now fetch my reservations
        res = api_client.get(f"{BASE_URL}/api/my-reservations?phone=061333444")
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        reservations = res.json()
        assert isinstance(reservations, list)
        # Should have at least one reservation
        phone_matches = [r for r in reservations if r.get("status") != "pending_verification"]
        assert len(phone_matches) >= 1, "Should have at least one verified reservation"

    def test_get_my_reservations_empty_phone_returns_error(self, api_client):
        res = api_client.get(f"{BASE_URL}/api/my-reservations?phone=1")
        # Phone too short (min_length=6 in query validation)
        assert res.status_code in [400, 422], f"Expected 400/422 for short phone, got {res.status_code}"

    def test_pending_verification_not_shown(self, api_client):
        """Unverified reservations should NOT show in my-reservations"""
        locs_res = api_client.get(f"{BASE_URL}/api/reservations/locations")
        locs = locs_res.json()
        if not locs:
            pytest.skip("No reservable locations")
        # Create but DON'T verify
        create_res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": locs[0]["id"],
            "customer_name": "TEST_Unverified",
            "customer_phone": "061777888",
            "date": "2026-09-01",
            "time": "20:00",
            "guests": 1
        })
        assert create_res.status_code == 200
        res = api_client.get(f"{BASE_URL}/api/my-reservations?phone=061777888")
        assert res.status_code == 200
        data = res.json()
        # Should be empty since reservation isn't verified
        assert len(data) == 0 or all(r.get("status") != "pending_verification" for r in data)


class TestBusinessReservations:
    """Test business panel reservation management"""

    def test_business_can_get_reservations(self, api_client, business_token):
        headers = {"Authorization": f"Bearer {business_token}"}
        res = api_client.get(f"{BASE_URL}/api/business/reservations", headers=headers)
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
        assert isinstance(res.json(), list)

    def test_unauthenticated_business_reservations_rejected(self, api_client):
        res = api_client.get(f"{BASE_URL}/api/business/reservations")
        assert res.status_code == 401, f"Expected 401 for unauthenticated, got {res.status_code}"

    def test_business_can_confirm_reservation(self, api_client, business_token):
        """Create, verify, then confirm a reservation via business API"""
        # Get business location
        headers = {"Authorization": f"Bearer {business_token}"}
        me_res = api_client.get(f"{BASE_URL}/api/auth/me", headers=headers)
        assert me_res.status_code == 200
        location_id = me_res.json().get("location_id")
        if not location_id:
            pytest.skip("Business user has no location_id")

        # Create reservation for this location
        create_res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": location_id,
            "customer_name": "TEST_BusinessConfirm",
            "customer_phone": "061555666",
            "date": "2026-10-01",
            "time": "19:00",
            "guests": 4
        })
        assert create_res.status_code == 200
        res_data = create_res.json()

        # Verify reservation
        verify_res = api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": res_data["reservation_id"],
            "code": res_data["verification_code"]
        })
        assert verify_res.status_code == 200

        # Business confirms
        confirm_res = api_client.put(
            f"{BASE_URL}/api/business/reservations/{res_data['reservation_id']}/status",
            json={"status": "confirmed", "note": "Sto broj 5"},
            headers=headers
        )
        assert confirm_res.status_code == 200, f"Expected 200 for confirm, got {confirm_res.status_code}: {confirm_res.text}"
