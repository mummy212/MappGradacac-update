"""
Tests for the dual reservation type system:
- table reservations (restaurants/cafes): date, time, table_preference
- room reservations (prenociste/hotels): check_in_date, check_out_date, room_type, bed_type
Also tests: business panel view, my-reservations endpoint field completeness.
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
def business_session(api_client):
    """Login as business user (Restoran Stari Grad)"""
    res = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "starigrad@test.ba",
        "password": "Test1234!"
    })
    if res.status_code != 200:
        pytest.skip(f"Business login failed: {res.status_code}")
    data = res.json()
    api_client.headers.update({"Authorization": f"Bearer {data['token']}"})
    return api_client, data.get("location_id")


def get_location_by_category(api_client, category):
    """Helper: get first location of given category"""
    res = api_client.get(f"{BASE_URL}/api/reservations/locations")
    assert res.status_code == 200
    locs = [l for l in res.json() if l.get("category") == category]
    if not locs:
        pytest.skip(f"No {category} locations found")
    return locs[0]


def create_and_verify(api_client, payload):
    """Helper: create reservation and verify it, returns reservation data"""
    res = api_client.post(f"{BASE_URL}/api/reservations", json=payload)
    assert res.status_code == 200, f"Create failed: {res.status_code} {res.text}"
    data = res.json()
    code = data.get("verification_code")
    res_id = data.get("reservation_id")
    if code:
        verify_res = api_client.post(f"{BASE_URL}/api/reservations/verify", json={
            "reservation_id": res_id, "code": code
        })
        assert verify_res.status_code == 200
    return data


# ─── TABLE RESERVATION TESTS ─────────────────────────────────────────────────

class TestTableReservation:
    """Restaurant/cafe table reservations with date, time, table_preference"""

    def test_create_table_reservation_returns_200(self, api_client):
        loc = get_location_by_category(api_client, "restaurant")
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": loc["id"],
            "reservation_type": "table",
            "customer_name": "TEST_TableUser",
            "customer_phone": "061100200",
            "date": "2026-07-10",
            "time": "19:00",
            "table_preference": "unutra",
            "guests": 3
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_create_table_reservation_has_verification_code(self, api_client):
        loc = get_location_by_category(api_client, "cafe")
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": loc["id"],
            "reservation_type": "table",
            "customer_name": "TEST_CafeUser",
            "customer_phone": "061100201",
            "date": "2026-07-11",
            "time": "10:00",
            "table_preference": "vani",
            "guests": 2
        })
        assert res.status_code == 200
        data = res.json()
        assert "verification_code" in data, "Missing verification_code field"
        assert "reservation_id" in data, "Missing reservation_id field"
        # Code must be 6-digit numeric
        code = str(data["verification_code"])
        assert len(code) == 6 and code.isdigit(), f"Code not 6 digits: {code}"

    def test_table_reservation_all_preferences_accepted(self, api_client):
        """All 3 table preferences should be accepted"""
        loc = get_location_by_category(api_client, "restaurant")
        for pref in ["unutra", "vani", "svejedno"]:
            res = api_client.post(f"{BASE_URL}/api/reservations", json={
                "location_id": loc["id"],
                "reservation_type": "table",
                "customer_name": f"TEST_Pref_{pref}",
                "customer_phone": "061100202",
                "date": "2026-07-12",
                "time": "12:00",
                "table_preference": pref,
                "guests": 2
            })
            assert res.status_code == 200, f"Preference '{pref}' rejected: {res.status_code}"

    def test_table_reservation_persists_in_business_panel(self, api_client, business_session):
        """After table reservation, business panel should show it with type='table'"""
        client, location_id = business_session
        if not location_id:
            pytest.skip("Business user has no location_id")

        # Create and verify reservation for this business location
        data = create_and_verify(api_client, {
            "location_id": location_id,
            "reservation_type": "table",
            "customer_name": "TEST_BizTableCheck",
            "customer_phone": "061200300",
            "date": "2026-08-05",
            "time": "20:00",
            "table_preference": "svejedno",
            "guests": 4
        })

        # Business fetches reservations
        res = client.get(f"{BASE_URL}/api/business/reservations")
        assert res.status_code == 200
        rsvs = res.json()
        # Find our test reservation
        found = next((r for r in rsvs if r.get("id") == data["reservation_id"]), None)
        assert found is not None, "Reservation not found in business panel"
        assert found.get("reservation_type") == "table", f"Expected table type, got: {found.get('reservation_type')}"
        assert found.get("date") == "2026-08-05", f"Date mismatch: {found.get('date')}"
        assert found.get("time") == "20:00", f"Time mismatch: {found.get('time')}"
        assert found.get("table_preference") == "svejedno", f"Preference mismatch: {found.get('table_preference')}"

    def test_table_reservation_in_my_reservations_has_required_fields(self, api_client):
        """my-reservations must return reservation_type + table fields"""
        loc = get_location_by_category(api_client, "restaurant")
        data = create_and_verify(api_client, {
            "location_id": loc["id"],
            "reservation_type": "table",
            "customer_name": "TEST_MyResTable",
            "customer_phone": "061300400",
            "date": "2026-09-01",
            "time": "18:00",
            "table_preference": "unutra",
            "guests": 2
        })

        res = api_client.get(f"{BASE_URL}/api/my-reservations?phone=061300400")
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1, "Should have at least 1 reservation in my-reservations"
        r = items[0]
        # Critical: must have reservation_type for mobile app to distinguish display
        assert "reservation_type" in r, "CRITICAL: reservation_type missing from my-reservations response"
        assert r.get("reservation_type") == "table", f"Expected table, got: {r.get('reservation_type')}"
        # Table fields
        assert "date" in r, "Missing date in my-reservations table response"
        assert "time" in r, "Missing time in my-reservations table response"


# ─── ROOM RESERVATION TESTS ──────────────────────────────────────────────────

class TestRoomReservation:
    """Prenociste/hotel room reservations with check_in/out dates, room_type, bed_type"""

    def test_create_room_reservation_returns_200(self, api_client):
        loc = get_location_by_category(api_client, "prenociste")
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": loc["id"],
            "reservation_type": "room",
            "customer_name": "TEST_RoomUser",
            "customer_phone": "061400500",
            "check_in_date": "2026-07-20",
            "check_out_date": "2026-07-22",
            "room_type": "soba",
            "bed_type": "bracni_krevet",
            "guests": 2
        })
        assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"

    def test_create_room_reservation_has_verification_code(self, api_client):
        loc = get_location_by_category(api_client, "prenociste")
        res = api_client.post(f"{BASE_URL}/api/reservations", json={
            "location_id": loc["id"],
            "reservation_type": "room",
            "customer_name": "TEST_RoomCode",
            "customer_phone": "061400501",
            "check_in_date": "2026-08-01",
            "check_out_date": "2026-08-03",
            "room_type": "apartman",
            "bed_type": "dva_kreveta",
            "guests": 2
        })
        assert res.status_code == 200
        data = res.json()
        assert "verification_code" in data, "Missing verification_code"
        assert "reservation_id" in data, "Missing reservation_id"
        code = str(data["verification_code"])
        assert len(code) == 6 and code.isdigit(), f"Code not 6 digits: {code}"

    def test_room_reservation_all_room_types_accepted(self, api_client):
        """All 3 room types should be accepted"""
        loc = get_location_by_category(api_client, "prenociste")
        for room_type in ["soba", "apartman", "studio"]:
            res = api_client.post(f"{BASE_URL}/api/reservations", json={
                "location_id": loc["id"],
                "reservation_type": "room",
                "customer_name": f"TEST_Room_{room_type}",
                "customer_phone": "061400502",
                "check_in_date": "2026-08-10",
                "check_out_date": "2026-08-11",
                "room_type": room_type,
                "bed_type": "jedan_krevet",
                "guests": 1
            })
            assert res.status_code == 200, f"Room type '{room_type}' rejected: {res.status_code}"

    def test_room_reservation_all_bed_types_accepted(self, api_client):
        """All 3 bed types should be accepted"""
        loc = get_location_by_category(api_client, "prenociste")
        for bed_type in ["jedan_krevet", "dva_kreveta", "bracni_krevet"]:
            res = api_client.post(f"{BASE_URL}/api/reservations", json={
                "location_id": loc["id"],
                "reservation_type": "room",
                "customer_name": f"TEST_Bed_{bed_type}",
                "customer_phone": "061400503",
                "check_in_date": "2026-09-01",
                "check_out_date": "2026-09-02",
                "room_type": "soba",
                "bed_type": bed_type,
                "guests": 1
            })
            assert res.status_code == 200, f"Bed type '{bed_type}' rejected: {res.status_code}"

    def test_room_reservation_persists_in_business_panel(self, api_client):
        """After room reservation, business panel should show type='room' with hotel fields"""
        loc = get_location_by_category(api_client, "prenociste")
        data = create_and_verify(api_client, {
            "location_id": loc["id"],
            "reservation_type": "room",
            "customer_name": "TEST_BizRoomCheck",
            "customer_phone": "061500600",
            "check_in_date": "2026-09-15",
            "check_out_date": "2026-09-17",
            "room_type": "apartman",
            "bed_type": "bracni_krevet",
            "guests": 2
        })

        # Login as admin to see all reservations
        admin_res = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gradacac.ba", "password": "Gradacac2024!"
        })
        assert admin_res.status_code == 200
        admin_token = admin_res.json()["token"]
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})

        biz_res = api_client.get(f"{BASE_URL}/api/business/reservations")
        assert biz_res.status_code == 200
        rsvs = biz_res.json()
        found = next((r for r in rsvs if r.get("id") == data["reservation_id"]), None)
        assert found is not None, "Room reservation not found in business panel"
        assert found.get("reservation_type") == "room", f"Expected room type, got: {found.get('reservation_type')}"
        assert found.get("check_in_date") == "2026-09-15", f"Check-in mismatch: {found.get('check_in_date')}"
        assert found.get("check_out_date") == "2026-09-17", f"Check-out mismatch: {found.get('check_out_date')}"
        assert found.get("room_type") == "apartman", f"Room type mismatch: {found.get('room_type')}"
        assert found.get("bed_type") == "bracni_krevet", f"Bed type mismatch: {found.get('bed_type')}"

    def test_room_reservation_in_my_reservations_has_required_fields(self, api_client):
        """my-reservations must return reservation_type + room fields for hotel bookings"""
        loc = get_location_by_category(api_client, "prenociste")
        data = create_and_verify(api_client, {
            "location_id": loc["id"],
            "reservation_type": "room",
            "customer_name": "TEST_MyResRoom",
            "customer_phone": "061600700",
            "check_in_date": "2026-10-01",
            "check_out_date": "2026-10-03",
            "room_type": "soba",
            "bed_type": "bracni_krevet",
            "guests": 2
        })

        res = api_client.get(f"{BASE_URL}/api/my-reservations?phone=061600700")
        assert res.status_code == 200
        items = res.json()
        assert len(items) >= 1, "Should have at least 1 reservation"
        r = items[0]
        # CRITICAL: reservation_type must be present so mobile app shows correct view
        assert "reservation_type" in r, "CRITICAL: reservation_type missing from my-reservations response for room"
        assert r.get("reservation_type") == "room", f"Expected room, got: {r.get('reservation_type')}"
        # Room-specific fields
        assert "check_in_date" in r, "CRITICAL: check_in_date missing from my-reservations for room"
        assert "check_out_date" in r, "CRITICAL: check_out_date missing from my-reservations for room"
        assert "room_type" in r, "CRITICAL: room_type missing from my-reservations for room"
        assert "bed_type" in r, "CRITICAL: bed_type missing from my-reservations for room"
        assert r.get("check_in_date") == "2026-10-01", f"check_in_date mismatch: {r.get('check_in_date')}"
        assert r.get("check_out_date") == "2026-10-03", f"check_out_date mismatch: {r.get('check_out_date')}"


# ─── BUSINESS PANEL DETAILS TESTS ────────────────────────────────────────────

class TestBusinessPanelReservationDetails:
    """Verify business panel returns all required fields for both reservation types"""

    def test_business_panel_table_fields_present(self, api_client, business_session):
        """Business panel reservations must include all table fields"""
        client, location_id = business_session
        if not location_id:
            pytest.skip("Business user has no location_id")

        data = create_and_verify(api_client, {
            "location_id": location_id,
            "reservation_type": "table",
            "customer_name": "TEST_BizTableFields",
            "customer_phone": "061700800",
            "date": "2026-11-01",
            "time": "19:30",
            "table_preference": "unutra",
            "guests": 2
        })

        res = client.get(f"{BASE_URL}/api/business/reservations")
        assert res.status_code == 200
        rsvs = res.json()
        found = next((r for r in rsvs if r.get("id") == data["reservation_id"]), None)
        assert found is not None, "Test reservation not found"
        assert found.get("reservation_type") == "table"
        assert found.get("date") == "2026-11-01"
        assert found.get("time") == "19:30"
        assert found.get("table_preference") == "unutra"
        assert found.get("guests") == 2
        assert "customer_name" in found
        assert "customer_phone" in found

    def test_business_panel_room_fields_present(self, api_client):
        """Business panel must return all room fields"""
        loc = get_location_by_category(api_client, "prenociste")
        data = create_and_verify(api_client, {
            "location_id": loc["id"],
            "reservation_type": "room",
            "customer_name": "TEST_BizRoomFields",
            "customer_phone": "061700801",
            "check_in_date": "2026-11-10",
            "check_out_date": "2026-11-12",
            "room_type": "studio",
            "bed_type": "jedan_krevet",
            "guests": 1
        })

        # Login as admin to check
        admin_res = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gradacac.ba", "password": "Gradacac2024!"
        })
        admin_token = admin_res.json()["token"]
        api_client.headers.update({"Authorization": f"Bearer {admin_token}"})

        res = api_client.get(f"{BASE_URL}/api/business/reservations")
        assert res.status_code == 200
        rsvs = res.json()
        found = next((r for r in rsvs if r.get("id") == data["reservation_id"]), None)
        assert found is not None, "Test reservation not found"
        assert found.get("reservation_type") == "room"
        assert found.get("check_in_date") == "2026-11-10"
        assert found.get("check_out_date") == "2026-11-12"
        assert found.get("room_type") == "studio"
        assert found.get("bed_type") == "jedan_krevet"
        assert found.get("guests") == 1

    def test_business_status_update_confirmed(self, api_client, business_session):
        """Business can confirm a table reservation"""
        client, location_id = business_session
        if not location_id:
            pytest.skip("Business user has no location_id")

        data = create_and_verify(api_client, {
            "location_id": location_id,
            "reservation_type": "table",
            "customer_name": "TEST_Confirm",
            "customer_phone": "061800900",
            "date": "2026-12-01",
            "time": "20:00",
            "guests": 3
        })

        res = client.put(
            f"{BASE_URL}/api/business/reservations/{data['reservation_id']}/status",
            json={"status": "confirmed", "note": "Sto broj 3"}
        )
        assert res.status_code == 200, f"Confirm failed: {res.status_code} {res.text}"
