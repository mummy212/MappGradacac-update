"""
Backend API tests for QR code and nearby offers features
Tests: nearby offers, QR data, coupon activation, activations list, redeem coupon
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


class TestNearbyOffers:
    """Test nearby offers endpoint"""
    
    def test_nearby_offers_with_coords(self):
        """Test GET /api/offers/nearby?lat=44.88&lng=18.43&radius=1000 returns nearby offers"""
        try:
            lat, lng, radius = 44.88, 18.43, 1000
            response = requests.get(f"{BASE_URL}/api/offers/nearby?lat={lat}&lng={lng}&radius={radius}", timeout=10)
            print(f"✓ GET /api/offers/nearby status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            print(f"✓ Nearby offers count: {len(data)}")
            
            if len(data) > 0:
                # Check structure
                offer = data[0]
                required_fields = ["id", "location_id", "title", "description", "is_active", "location_name", "distance"]
                for field in required_fields:
                    assert field in offer, f"Offer missing field: {field}"
                
                # Verify distance field
                assert isinstance(offer["distance"], (int, float)), f"distance should be number, got {type(offer['distance'])}"
                assert offer["distance"] <= radius, f"Offer distance {offer['distance']}m exceeds radius {radius}m"
                
                # Verify sorted by distance
                distances = [o["distance"] for o in data]
                assert distances == sorted(distances), "Offers not sorted by distance"
                
                print(f"✓ Nearby offers have distance field and are sorted")
                print(f"  Closest: {offer['title']} at {offer['location_name']} - {offer['distance']}m")
                
                # Verify location_name enrichment
                assert offer["location_name"], "location_name should not be empty"
                print(f"✓ Offers enriched with location_name")
            else:
                print(f"⚠ No nearby offers found within {radius}m (this is OK if no offers in range)")
            
        except Exception as e:
            print(f"✗ Nearby offers test failed: {str(e)}")
            raise
    
    def test_nearby_offers_different_radius(self):
        """Test nearby offers with different radius values"""
        try:
            lat, lng = 44.88, 18.43
            
            # Test with small radius
            r1 = requests.get(f"{BASE_URL}/api/offers/nearby?lat={lat}&lng={lng}&radius=500", timeout=10)
            assert r1.status_code == 200
            data_500 = r1.json()
            
            # Test with larger radius
            r2 = requests.get(f"{BASE_URL}/api/offers/nearby?lat={lat}&lng={lng}&radius=2000", timeout=10)
            assert r2.status_code == 200
            data_2000 = r2.json()
            
            # Larger radius should return same or more offers
            assert len(data_2000) >= len(data_500), "Larger radius should return more or equal offers"
            
            print(f"✓ Radius filtering works correctly")
            print(f"  500m radius: {len(data_500)} offers")
            print(f"  2000m radius: {len(data_2000)} offers")
            
        except Exception as e:
            print(f"✗ Radius filtering test failed: {str(e)}")
            raise
    
    def test_nearby_offers_missing_params(self):
        """Test nearby offers endpoint requires lat, lng, radius"""
        try:
            # Missing lat
            r1 = requests.get(f"{BASE_URL}/api/offers/nearby?lng=18.43&radius=1000", timeout=10)
            assert r1.status_code == 422, "Should return 422 for missing lat"
            
            # Missing lng
            r2 = requests.get(f"{BASE_URL}/api/offers/nearby?lat=44.88&radius=1000", timeout=10)
            assert r2.status_code == 422, "Should return 422 for missing lng"
            
            print(f"✓ Nearby offers endpoint validates required params")
            
        except Exception as e:
            print(f"✗ Missing params test failed: {str(e)}")
            raise


class TestQRData:
    """Test QR data endpoint"""
    
    def test_get_qr_data_for_location(self):
        """Test GET /api/locations/{id}/qr-data returns QR data with offers"""
        try:
            # Get first location
            all_locs = requests.get(f"{BASE_URL}/api/locations", timeout=10).json()
            assert len(all_locs) > 0
            loc_id = all_locs[0]["id"]
            loc_name = all_locs[0]["name"]
            
            response = requests.get(f"{BASE_URL}/api/locations/{loc_id}/qr-data", timeout=10)
            print(f"✓ GET /api/locations/{loc_id}/qr-data status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            
            # Check structure
            required_fields = ["location_id", "location_name", "offers"]
            for field in required_fields:
                assert field in data, f"QR data missing field: {field}"
            
            assert data["location_id"] == loc_id, "location_id mismatch"
            assert data["location_name"] == loc_name, "location_name mismatch"
            assert isinstance(data["offers"], list), "offers should be a list"
            
            print(f"✓ QR data structure correct")
            print(f"  Location: {data['location_name']}")
            print(f"  Active offers: {len(data['offers'])}")
            
            # Check offer structure if offers exist
            if len(data["offers"]) > 0:
                offer = data["offers"][0]
                assert "id" in offer, "Offer missing id"
                assert "title" in offer, "Offer missing title"
                assert "discount_percent" in offer or offer.get("discount_percent") is None, "Offer missing discount_percent"
                print(f"  Sample offer: {offer['title']}")
            
        except Exception as e:
            print(f"✗ QR data test failed: {str(e)}")
            raise
    
    def test_qr_data_invalid_location(self):
        """Test QR data endpoint with invalid location ID"""
        try:
            response = requests.get(f"{BASE_URL}/api/locations/invalid-id-12345/qr-data", timeout=10)
            print(f"✓ GET /api/locations/invalid-id/qr-data status: {response.status_code}")
            assert response.status_code == 404, "Should return 404 for invalid location"
            
            print(f"✓ QR data endpoint validates location ID")
            
        except Exception as e:
            print(f"✗ Invalid location test failed: {str(e)}")
            raise


class TestCouponActivation:
    """Test coupon activation flow"""
    
    def test_activate_coupon_success(self):
        """Test POST /api/offers/{id}/activate activates coupon"""
        try:
            # Get first active offer
            offers = requests.get(f"{BASE_URL}/api/offers", timeout=10).json()
            assert len(offers) > 0, "No offers available for testing"
            
            offer_id = offers[0]["id"]
            offer_title = offers[0]["title"]
            
            payload = {"user_name": "TEST User"}
            
            response = requests.post(f"{BASE_URL}/api/offers/{offer_id}/activate", json=payload, timeout=10)
            print(f"✓ POST /api/offers/{offer_id}/activate status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            
            # Check response structure
            required_fields = ["activation_id", "offer_title", "message"]
            for field in required_fields:
                assert field in data, f"Activation response missing field: {field}"
            
            assert data["offer_title"] == offer_title, "offer_title mismatch"
            assert data["activation_id"], "activation_id should not be empty"
            assert "aktiviran" in data["message"].lower() or "activated" in data["message"].lower(), "Message should confirm activation"
            
            print(f"✓ Coupon activated successfully")
            print(f"  Activation ID: {data['activation_id']}")
            print(f"  Offer: {data['offer_title']}")
            if "discount_percent" in data:
                print(f"  Discount: {data['discount_percent']}%")
            
            # Store activation_id for later tests
            return data["activation_id"]
            
        except Exception as e:
            print(f"✗ Activate coupon test failed: {str(e)}")
            raise
    
    def test_activate_coupon_missing_user_name(self):
        """Test activation requires user_name"""
        try:
            offers = requests.get(f"{BASE_URL}/api/offers", timeout=10).json()
            assert len(offers) > 0
            offer_id = offers[0]["id"]
            
            # Empty payload
            response = requests.post(f"{BASE_URL}/api/offers/{offer_id}/activate", json={}, timeout=10)
            print(f"✓ POST /api/offers/{id}/activate (no user_name) status: {response.status_code}")
            assert response.status_code == 422, "Should return 422 for missing user_name"
            
            print(f"✓ Activation endpoint validates user_name")
            
        except Exception as e:
            print(f"✗ Missing user_name test failed: {str(e)}")
            raise
    
    def test_activate_invalid_offer(self):
        """Test activation with invalid offer ID"""
        try:
            payload = {"user_name": "TEST User"}
            response = requests.post(f"{BASE_URL}/api/offers/invalid-offer-id/activate", json=payload, timeout=10)
            print(f"✓ POST /api/offers/invalid-id/activate status: {response.status_code}")
            assert response.status_code == 404, "Should return 404 for invalid offer"
            
            print(f"✓ Activation endpoint validates offer ID")
            
        except Exception as e:
            print(f"✗ Invalid offer test failed: {str(e)}")
            raise


class TestActivationsList:
    """Test activations list endpoint (requires auth)"""
    
    def test_get_activations_without_auth(self):
        """Test GET /api/offers/{id}/activations requires auth"""
        try:
            offers = requests.get(f"{BASE_URL}/api/offers", timeout=10).json()
            assert len(offers) > 0
            offer_id = offers[0]["id"]
            
            response = requests.get(f"{BASE_URL}/api/offers/{offer_id}/activations", timeout=10)
            print(f"✓ GET /api/offers/{offer_id}/activations (no auth) status: {response.status_code}")
            assert response.status_code == 401, "Should return 401 without auth"
            
            print(f"✓ Activations list requires auth")
            
        except Exception as e:
            print(f"✗ Activations no-auth test failed: {str(e)}")
            raise
    
    def test_get_activations_with_admin_auth(self, admin_token):
        """Test GET /api/offers/{id}/activations returns activations with admin auth"""
        try:
            offers = requests.get(f"{BASE_URL}/api/offers", timeout=10).json()
            assert len(offers) > 0
            offer_id = offers[0]["id"]
            
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.get(f"{BASE_URL}/api/offers/{offer_id}/activations", headers=headers, timeout=10)
            print(f"✓ GET /api/offers/{offer_id}/activations (admin auth) status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert isinstance(data, list), "Activations should be a list"
            
            print(f"✓ Activations list retrieved successfully")
            print(f"  Activations count: {len(data)}")
            
            if len(data) > 0:
                activation = data[0]
                required_fields = ["id", "offer_id", "location_id", "user_name", "activated_at", "redeemed"]
                for field in required_fields:
                    assert field in activation, f"Activation missing field: {field}"
                
                assert isinstance(activation["redeemed"], bool), "redeemed should be boolean"
                print(f"  Sample: User '{activation['user_name']}' - Redeemed: {activation['redeemed']}")
            
        except Exception as e:
            print(f"✗ Get activations test failed: {str(e)}")
            raise


class TestRedeemCoupon:
    """Test coupon redemption endpoint (requires auth)"""
    
    def test_redeem_coupon_without_auth(self):
        """Test PUT /api/coupon-activations/{id}/redeem requires auth"""
        try:
            response = requests.put(f"{BASE_URL}/api/coupon-activations/dummy-id/redeem", timeout=10)
            print(f"✓ PUT /api/coupon-activations/dummy-id/redeem (no auth) status: {response.status_code}")
            assert response.status_code == 401, "Should return 401 without auth"
            
            print(f"✓ Redeem coupon requires auth")
            
        except Exception as e:
            print(f"✗ Redeem no-auth test failed: {str(e)}")
            raise
    
    def test_redeem_coupon_with_admin_auth(self, admin_token):
        """Test PUT /api/coupon-activations/{id}/redeem marks coupon as redeemed"""
        try:
            # First, create an activation
            offers = requests.get(f"{BASE_URL}/api/offers", timeout=10).json()
            assert len(offers) > 0
            offer_id = offers[0]["id"]
            
            # Activate coupon
            activation_resp = requests.post(f"{BASE_URL}/api/offers/{offer_id}/activate", 
                                           json={"user_name": "TEST Redeem User"}, timeout=10)
            assert activation_resp.status_code == 200
            activation_id = activation_resp.json()["activation_id"]
            
            print(f"✓ Created test activation: {activation_id}")
            
            # Now redeem it
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.put(f"{BASE_URL}/api/coupon-activations/{activation_id}/redeem", 
                                   headers=headers, timeout=10)
            print(f"✓ PUT /api/coupon-activations/{activation_id}/redeem status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert "message" in data, "Response should have message"
            assert "iskorišten" in data["message"].lower() or "redeemed" in data["message"].lower(), "Message should confirm redemption"
            
            print(f"✓ Coupon redeemed successfully")
            print(f"  Message: {data['message']}")
            
            # Verify redemption by checking activations list
            activations_resp = requests.get(f"{BASE_URL}/api/offers/{offer_id}/activations", 
                                           headers=headers, timeout=10)
            assert activations_resp.status_code == 200
            activations = activations_resp.json()
            
            # Find our activation
            our_activation = next((a for a in activations if a["id"] == activation_id), None)
            if our_activation:
                assert our_activation["redeemed"] == True, "Activation should be marked as redeemed"
                assert "redeemed_at" in our_activation, "Should have redeemed_at timestamp"
                print(f"✓ Verified activation marked as redeemed in database")
            
        except Exception as e:
            print(f"✗ Redeem coupon test failed: {str(e)}")
            raise
    
    def test_redeem_invalid_activation(self, admin_token):
        """Test redeem with invalid activation ID"""
        try:
            headers = {"Authorization": f"Bearer {admin_token}"}
            response = requests.put(f"{BASE_URL}/api/coupon-activations/invalid-activation-id/redeem", 
                                   headers=headers, timeout=10)
            print(f"✓ PUT /api/coupon-activations/invalid-id/redeem status: {response.status_code}")
            assert response.status_code == 404, "Should return 404 for invalid activation ID"
            
            print(f"✓ Redeem endpoint validates activation ID")
            
        except Exception as e:
            print(f"✗ Invalid activation test failed: {str(e)}")
            raise
