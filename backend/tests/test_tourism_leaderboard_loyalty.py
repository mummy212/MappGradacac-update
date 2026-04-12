"""
Backend tests for new features:
- Tourism/Attractions endpoint
- Leaderboard endpoint
- Loyalty points endpoint
"""
import pytest
import requests
import os

# Get backend URL from environment
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL')
if not BASE_URL:
    # Fallback: read from frontend .env
    import subprocess
    result = subprocess.run(['cat', '/app/frontend/.env'], capture_output=True, text=True)
    for line in result.stdout.split('\n'):
        if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
            BASE_URL = line.split('=')[1].strip()
            break
if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment")
BASE_URL = BASE_URL.rstrip('/')

class TestTourismAttractions:
    """Test GET /api/tourism/attractions endpoint"""

    def test_get_attractions_returns_list(self):
        """Should return list of attractions"""
        response = requests.get(f"{BASE_URL}/api/tourism/attractions")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/tourism/attractions returned {len(data)} attractions")

    def test_attractions_count(self):
        """Should return 5 attractions as per requirements"""
        response = requests.get(f"{BASE_URL}/api/tourism/attractions")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) == 5, f"Expected 5 attractions, got {len(data)}"
        print(f"✓ Attractions count is correct: {len(data)}")

    def test_attraction_structure(self):
        """Each attraction should have required fields"""
        response = requests.get(f"{BASE_URL}/api/tourism/attractions")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) > 0, "Should have at least one attraction"
        
        attraction = data[0]
        required_fields = ['id', 'name', 'description', 'category']
        for field in required_fields:
            assert field in attraction, f"Attraction missing field: {field}"
        
        # Validate data types
        assert isinstance(attraction['id'], str), "id should be string"
        assert isinstance(attraction['name'], str), "name should be string"
        assert isinstance(attraction['description'], str), "description should be string"
        assert isinstance(attraction['category'], str), "category should be string"
        
        print(f"✓ Attraction structure valid: {attraction['name']} - {attraction['category']}")


class TestLeaderboard:
    """Test GET /api/leaderboard endpoint"""

    def test_get_leaderboard_returns_list(self):
        """Should return list of top locations"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ GET /api/leaderboard returned {len(data)} locations")

    def test_leaderboard_structure(self):
        """Each leaderboard entry should have required fields"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) == 0:
            print("⚠ Leaderboard is empty (no locations with reviews yet)")
            pytest.skip("No locations with reviews to test")
        
        entry = data[0]
        required_fields = ['id', 'name', 'avg_rating', 'review_count']
        for field in required_fields:
            assert field in entry, f"Leaderboard entry missing field: {field}"
        
        # Validate data types
        assert isinstance(entry['id'], str), "id should be string"
        assert isinstance(entry['name'], str), "name should be string"
        assert isinstance(entry['avg_rating'], (int, float)), "avg_rating should be number"
        assert isinstance(entry['review_count'], int), "review_count should be integer"
        
        # Validate review_count > 0 (as per backend logic line 668)
        assert entry['review_count'] > 0, "Leaderboard should only show locations with reviews"
        
        print(f"✓ Leaderboard entry valid: {entry['name']} - {entry['avg_rating']} stars ({entry['review_count']} reviews)")

    def test_leaderboard_sorted_by_rating(self):
        """Leaderboard should be sorted by rating descending"""
        response = requests.get(f"{BASE_URL}/api/leaderboard")
        assert response.status_code == 200
        
        data = response.json()
        if len(data) < 2:
            print("⚠ Not enough data to test sorting")
            pytest.skip("Need at least 2 entries to test sorting")
        
        # Check if sorted by avg_rating descending
        for i in range(len(data) - 1):
            current_rating = data[i]['avg_rating']
            next_rating = data[i + 1]['avg_rating']
            assert current_rating >= next_rating, f"Leaderboard not sorted: {current_rating} < {next_rating}"
        
        print(f"✓ Leaderboard correctly sorted by rating")

    def test_leaderboard_limit_parameter(self):
        """Should respect limit parameter"""
        response = requests.get(f"{BASE_URL}/api/leaderboard?limit=3")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) <= 3, f"Expected max 3 entries, got {len(data)}"
        print(f"✓ Leaderboard limit parameter working: {len(data)} entries")


class TestLoyaltyPoints:
    """Test GET /api/loyalty/{name} endpoint"""

    def test_get_loyalty_new_user(self):
        """Should return zero points for new user"""
        test_name = "TEST_NewUser_12345"
        response = requests.get(f"{BASE_URL}/api/loyalty/{test_name}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert 'points' in data, "Response should have 'points' field"
        assert 'total_visits' in data, "Response should have 'total_visits' field"
        assert data['points'] == 0, f"New user should have 0 points, got {data['points']}"
        assert data['total_visits'] == 0, f"New user should have 0 visits, got {data['total_visits']}"
        
        print(f"✓ New user loyalty data correct: {data['points']} points, {data['total_visits']} visits")

    def test_loyalty_checkin_and_verify(self):
        """Should earn points after checkin"""
        test_name = "TEST_LoyaltyUser_67890"
        
        # Get a location ID first
        locations_response = requests.get(f"{BASE_URL}/api/locations")
        assert locations_response.status_code == 200
        locations = locations_response.json()
        assert len(locations) > 0, "Need at least one location"
        location_id = locations[0]['id']
        
        # Checkin
        checkin_response = requests.post(
            f"{BASE_URL}/api/loyalty/checkin",
            json={"user_name": test_name, "location_id": location_id}
        )
        assert checkin_response.status_code == 200, f"Checkin failed: {checkin_response.status_code}"
        
        checkin_data = checkin_response.json()
        assert 'points' in checkin_data, "Checkin response should have 'points'"
        assert checkin_data['points'] >= 10, f"Should earn at least 10 points, got {checkin_data['points']}"
        
        print(f"✓ Checkin successful: {checkin_data['points']} points earned")
        
        # Verify points persisted
        loyalty_response = requests.get(f"{BASE_URL}/api/loyalty/{test_name}")
        assert loyalty_response.status_code == 200
        
        loyalty_data = loyalty_response.json()
        assert loyalty_data['points'] >= 10, f"Points not persisted: {loyalty_data['points']}"
        assert loyalty_data['total_visits'] >= 1, f"Visits not tracked: {loyalty_data['total_visits']}"
        
        print(f"✓ Loyalty data persisted: {loyalty_data['points']} points, {loyalty_data['total_visits']} visits")

    def test_loyalty_structure(self):
        """Loyalty data should have correct structure"""
        test_name = "TEST_StructureCheck_99999"
        
        response = requests.get(f"{BASE_URL}/api/loyalty/{test_name}")
        assert response.status_code == 200
        
        data = response.json()
        required_fields = ['user_name', 'points', 'total_visits', 'visits']
        for field in required_fields:
            assert field in data, f"Loyalty data missing field: {field}"
        
        # Validate data types
        assert isinstance(data['user_name'], str), "user_name should be string"
        assert isinstance(data['points'], int), "points should be integer"
        assert isinstance(data['total_visits'], int), "total_visits should be integer"
        assert isinstance(data['visits'], list), "visits should be list"
        
        print(f"✓ Loyalty data structure valid")


class TestIntegration:
    """Integration tests for new features"""

    def test_all_new_endpoints_accessible(self):
        """All 3 new endpoints should be accessible"""
        endpoints = [
            "/api/tourism/attractions",
            "/api/leaderboard",
            "/api/loyalty/test_user"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code == 200, f"Endpoint {endpoint} returned {response.status_code}"
            print(f"✓ {endpoint} accessible")
        
        print(f"✓ All 3 new endpoints working")
