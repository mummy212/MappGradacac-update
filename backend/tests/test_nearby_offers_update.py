"""
Test nearby offers API endpoint for Gradačac city map update
Tests GET /api/offers/nearby with GPS coordinates and radius
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL') or os.environ.get('EXPO_BACKEND_URL')
if BASE_URL:
    BASE_URL = BASE_URL.rstrip('/')
else:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL or EXPO_BACKEND_URL must be set")

class TestNearbyOffersAPI:
    """Test nearby offers endpoint"""

    def test_nearby_offers_with_valid_coords(self):
        """Test GET /api/offers/nearby with valid coordinates"""
        # Gradačac center coordinates
        response = requests.get(
            f"{BASE_URL}/api/offers/nearby",
            params={"lat": 44.88, "lng": 18.43, "radius": 500}
        )
        print(f"✓ GET /api/offers/nearby status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        print(f"✓ Response is valid JSON, type: {type(data)}")
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"✓ Found {len(data)} nearby offers")
        
        # If offers exist, verify structure
        if len(data) > 0:
            offer = data[0]
            print(f"✓ First offer: {offer.get('title', 'N/A')}")
            assert "id" in offer, "Offer missing 'id'"
            assert "location_id" in offer, "Offer missing 'location_id'"
            assert "title" in offer, "Offer missing 'title'"
            assert "description" in offer, "Offer missing 'description'"
            assert "location_name" in offer, "Offer missing 'location_name'"
            assert "distance" in offer, "Offer missing 'distance'"
            print(f"✓ Offer structure valid: location_name={offer['location_name']}, distance={offer['distance']}m")
            
            # Verify distance is within radius
            assert offer["distance"] <= 500, f"Distance {offer['distance']}m exceeds radius 500m"
            print(f"✓ Distance {offer['distance']}m is within 500m radius")
        else:
            print("⚠ No offers found within 500m radius (this is OK if no test data exists)")

    def test_nearby_offers_different_radius(self):
        """Test nearby offers with different radius values"""
        # Test with 1000m radius
        response = requests.get(
            f"{BASE_URL}/api/offers/nearby",
            params={"lat": 44.8797, "lng": 18.4275, "radius": 1000}
        )
        print(f"✓ GET /api/offers/nearby (1000m radius) status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"✓ Found {len(data)} offers within 1000m")
        
        # Verify all distances are within radius
        for offer in data:
            assert offer["distance"] <= 1000, f"Offer {offer['id']} distance {offer['distance']}m exceeds 1000m"
        print(f"✓ All offers within 1000m radius")

    def test_nearby_offers_sorted_by_distance(self):
        """Test that nearby offers are sorted by distance"""
        response = requests.get(
            f"{BASE_URL}/api/offers/nearby",
            params={"lat": 44.8797, "lng": 18.4275, "radius": 2000}
        )
        assert response.status_code == 200
        
        data = response.json()
        if len(data) > 1:
            distances = [offer["distance"] for offer in data]
            print(f"✓ Distances: {distances}")
            assert distances == sorted(distances), "Offers not sorted by distance"
            print(f"✓ Offers correctly sorted by distance (ascending)")
        else:
            print(f"⚠ Only {len(data)} offers found, cannot verify sorting")

    def test_nearby_offers_missing_params(self):
        """Test nearby offers with missing required parameters"""
        # Missing lat
        response = requests.get(
            f"{BASE_URL}/api/offers/nearby",
            params={"lng": 18.43, "radius": 500}
        )
        print(f"✓ Missing 'lat' param returns status: {response.status_code}")
        assert response.status_code == 422, f"Expected 422 for missing lat, got {response.status_code}"
        
        # Missing lng
        response = requests.get(
            f"{BASE_URL}/api/offers/nearby",
            params={"lat": 44.88, "radius": 500}
        )
        print(f"✓ Missing 'lng' param returns status: {response.status_code}")
        assert response.status_code == 422, f"Expected 422 for missing lng, got {response.status_code}"

    def test_nearby_offers_default_radius(self):
        """Test nearby offers with default radius (500m)"""
        response = requests.get(
            f"{BASE_URL}/api/offers/nearby",
            params={"lat": 44.88, "lng": 18.43}
        )
        print(f"✓ GET /api/offers/nearby (default radius) status: {response.status_code}")
        assert response.status_code == 200
        
        data = response.json()
        print(f"✓ Found {len(data)} offers with default radius")
        
        # Verify all distances are within default 500m
        for offer in data:
            assert offer["distance"] <= 500, f"Offer distance {offer['distance']}m exceeds default 500m"
        print(f"✓ All offers within default 500m radius")

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
