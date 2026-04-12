"""
Backend API tests for Extended Location Details and Reviews
Tests: Extended location fields, Reviews CRUD, Rating aggregation, Admin delete review
"""
import pytest
import requests
import os
from pathlib import Path
from dotenv import load_dotenv
import time

# Load frontend .env to get EXPO_PUBLIC_BACKEND_URL
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
if frontend_env.exists():
    load_dotenv(frontend_env)

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

if not BASE_URL:
    raise ValueError("EXPO_PUBLIC_BACKEND_URL not found in environment. Cannot run tests.")

# Admin credentials from test_credentials.md
ADMIN_EMAIL = "admin@gradacac.ba"
ADMIN_PASSWORD = "Gradacac2024!"


class TestExtendedLocationFields:
    """Test extended location fields: service_tags, price_level, avg_rating, review_count"""
    
    def test_locations_have_extended_fields(self):
        """Test GET /api/locations returns locations with extended fields"""
        try:
            response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            print(f"✓ GET /api/locations status: {response.status_code}")
            assert response.status_code == 200
            
            data = response.json()
            assert len(data) > 0, "Expected at least 1 location"
            
            # Check first location has extended fields
            loc = data[0]
            assert "service_tags" in loc, "Missing service_tags field"
            assert "price_level" in loc, "Missing price_level field"
            assert "avg_rating" in loc, "Missing avg_rating field"
            assert "review_count" in loc, "Missing review_count field"
            
            print(f"✓ Extended fields present: service_tags, price_level, avg_rating, review_count")
            print(f"  Sample location: {loc['name']}")
            print(f"    - service_tags: {loc.get('service_tags', [])}")
            print(f"    - price_level: {loc.get('price_level', 0)}")
            print(f"    - avg_rating: {loc.get('avg_rating', 0)}")
            print(f"    - review_count: {loc.get('review_count', 0)}")
            
        except Exception as e:
            print(f"✗ Extended fields test failed: {str(e)}")
            raise
    
    def test_location_detail_has_extended_fields(self):
        """Test GET /api/locations/{id} returns full location detail with extended fields"""
        try:
            # Get first location ID
            list_response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            assert list_response.status_code == 200
            locations = list_response.json()
            assert len(locations) > 0
            location_id = locations[0]['id']
            
            # Get detail
            response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            print(f"✓ GET /api/locations/{location_id} status: {response.status_code}")
            assert response.status_code == 200
            
            loc = response.json()
            assert "service_tags" in loc
            assert "price_level" in loc
            assert "avg_rating" in loc
            assert "review_count" in loc
            assert "images" in loc
            assert "description" in loc
            
            print(f"✓ Location detail has all extended fields")
            print(f"  Location: {loc['name']}")
            
        except Exception as e:
            print(f"✗ Location detail test failed: {str(e)}")
            raise


class TestReviewsPublic:
    """Test public review endpoints (no auth required)"""
    
    def test_create_review_no_auth(self):
        """Test POST /api/locations/{id}/reviews creates review without auth"""
        try:
            # Get first location
            list_response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            assert list_response.status_code == 200
            locations = list_response.json()
            location_id = locations[0]['id']
            
            # Create review
            review_data = {
                "author_name": "TEST_User",
                "stars": 5,
                "comment": "Odlično mjesto! Test recenzija."
            }
            
            response = requests.post(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                json=review_data,
                timeout=10
            )
            print(f"✓ POST /api/locations/{location_id}/reviews status: {response.status_code}")
            assert response.status_code == 200
            
            review = response.json()
            assert "id" in review
            assert review["author_name"] == review_data["author_name"]
            assert review["stars"] == review_data["stars"]
            assert review["comment"] == review_data["comment"]
            assert review["location_id"] == location_id
            
            print(f"✓ Review created successfully (no auth required)")
            print(f"  Review ID: {review['id']}")
            print(f"  Author: {review['author_name']}, Stars: {review['stars']}")
            
            # Store for cleanup
            self.test_review_id = review['id']
            self.test_location_id = location_id
            
        except Exception as e:
            print(f"✗ Create review test failed: {str(e)}")
            raise
    
    def test_get_reviews_for_location(self):
        """Test GET /api/locations/{id}/reviews returns reviews"""
        try:
            # Get first location
            list_response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            assert list_response.status_code == 200
            locations = list_response.json()
            location_id = locations[0]['id']
            
            response = requests.get(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                timeout=10
            )
            print(f"✓ GET /api/locations/{location_id}/reviews status: {response.status_code}")
            assert response.status_code == 200
            
            reviews = response.json()
            assert isinstance(reviews, list)
            print(f"✓ Reviews retrieved: {len(reviews)} reviews")
            
            if len(reviews) > 0:
                review = reviews[0]
                assert "id" in review
                assert "author_name" in review
                assert "stars" in review
                assert "location_id" in review
                assert "created_at" in review
                print(f"  Sample review: {review['author_name']} - {review['stars']} stars")
            
        except Exception as e:
            print(f"✗ Get reviews test failed: {str(e)}")
            raise
    
    def test_create_review_without_comment(self):
        """Test creating review with only name and stars (comment optional)"""
        try:
            list_response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            locations = list_response.json()
            location_id = locations[1]['id'] if len(locations) > 1 else locations[0]['id']
            
            review_data = {
                "author_name": "TEST_NoComment",
                "stars": 4
            }
            
            response = requests.post(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                json=review_data,
                timeout=10
            )
            print(f"✓ Create review without comment status: {response.status_code}")
            assert response.status_code == 200
            
            review = response.json()
            assert review["author_name"] == review_data["author_name"]
            assert review["stars"] == review_data["stars"]
            assert review.get("comment") is None or review.get("comment") == ""
            
            print(f"✓ Review created without comment (optional field works)")
            
        except Exception as e:
            print(f"✗ Create review without comment failed: {str(e)}")
            raise
    
    def test_create_review_invalid_stars(self):
        """Test creating review with invalid stars (must be 1-5)"""
        try:
            list_response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            locations = list_response.json()
            location_id = locations[0]['id']
            
            # Try stars = 0 (invalid)
            review_data = {
                "author_name": "TEST_Invalid",
                "stars": 0
            }
            
            response = requests.post(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                json=review_data,
                timeout=10
            )
            print(f"✓ Create review with stars=0 status: {response.status_code}")
            assert response.status_code == 422, "Expected 422 for invalid stars"
            
            # Try stars = 6 (invalid)
            review_data["stars"] = 6
            response = requests.post(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                json=review_data,
                timeout=10
            )
            print(f"✓ Create review with stars=6 status: {response.status_code}")
            assert response.status_code == 422, "Expected 422 for invalid stars"
            
            print(f"✓ Star validation working (1-5 only)")
            
        except Exception as e:
            print(f"✗ Invalid stars test failed: {str(e)}")
            raise


class TestRatingAggregation:
    """Test that reviews update avg_rating and review_count on location"""
    
    def test_review_updates_location_rating(self):
        """Test that creating a review updates location's avg_rating and review_count"""
        try:
            # Get a location with few/no reviews
            list_response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            locations = list_response.json()
            # Find location with 0 reviews or use last one
            location = next((loc for loc in locations if loc.get('review_count', 0) == 0), locations[-1])
            location_id = location['id']
            
            # Get initial state
            initial_response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            initial = initial_response.json()
            initial_count = initial.get('review_count', 0)
            initial_rating = initial.get('avg_rating', 0)
            
            print(f"✓ Initial state: {initial['name']}")
            print(f"  - review_count: {initial_count}")
            print(f"  - avg_rating: {initial_rating}")
            
            # Create a review with 5 stars
            review_data = {
                "author_name": "TEST_RatingCheck",
                "stars": 5,
                "comment": "Testing rating aggregation"
            }
            
            create_response = requests.post(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                json=review_data,
                timeout=10
            )
            assert create_response.status_code == 200
            print(f"✓ Review created with 5 stars")
            
            # Wait a moment for aggregation
            time.sleep(0.5)
            
            # Get updated location
            updated_response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            updated = updated_response.json()
            updated_count = updated.get('review_count', 0)
            updated_rating = updated.get('avg_rating', 0)
            
            print(f"✓ Updated state:")
            print(f"  - review_count: {updated_count}")
            print(f"  - avg_rating: {updated_rating}")
            
            # Verify count increased
            assert updated_count == initial_count + 1, f"Expected review_count to increase by 1, got {updated_count}"
            
            # Verify rating updated
            if initial_count == 0:
                assert updated_rating == 5.0, f"Expected avg_rating to be 5.0, got {updated_rating}"
            else:
                assert updated_rating > 0, "Expected avg_rating to be > 0"
            
            print(f"✓ Rating aggregation working correctly")
            
        except Exception as e:
            print(f"✗ Rating aggregation test failed: {str(e)}")
            raise


class TestAdminDeleteReview:
    """Test admin can delete reviews"""
    
    def test_admin_delete_review_with_auth(self):
        """Test DELETE /api/admin/reviews/{id} with admin auth"""
        try:
            # Login as admin
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=10
            )
            assert login_response.status_code == 200
            token = login_response.json()["token"]
            print(f"✓ Admin logged in")
            
            # Create a test review first
            list_response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            locations = list_response.json()
            location_id = locations[0]['id']
            
            review_data = {
                "author_name": "TEST_ToDelete",
                "stars": 3,
                "comment": "This review will be deleted"
            }
            
            create_response = requests.post(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                json=review_data,
                timeout=10
            )
            assert create_response.status_code == 200
            review_id = create_response.json()["id"]
            print(f"✓ Test review created: {review_id}")
            
            # Delete review as admin
            delete_response = requests.delete(
                f"{BASE_URL}/api/admin/reviews/{review_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            print(f"✓ DELETE /api/admin/reviews/{review_id} status: {delete_response.status_code}")
            assert delete_response.status_code == 200
            
            print(f"✓ Admin successfully deleted review")
            
            # Verify review is gone from list
            reviews_response = requests.get(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                timeout=10
            )
            reviews = reviews_response.json()
            review_ids = [r['id'] for r in reviews]
            assert review_id not in review_ids, "Review should be deleted"
            
            print(f"✓ Review confirmed deleted from reviews list")
            
        except Exception as e:
            print(f"✗ Admin delete review test failed: {str(e)}")
            raise
    
    def test_admin_delete_review_without_auth(self):
        """Test DELETE /api/admin/reviews/{id} without auth returns 401"""
        try:
            # Try to delete without auth
            response = requests.delete(
                f"{BASE_URL}/api/admin/reviews/fake-review-id",
                timeout=10
            )
            print(f"✓ DELETE /api/admin/reviews without auth status: {response.status_code}")
            assert response.status_code == 401, "Expected 401 without auth"
            
            print(f"✓ Admin delete review requires auth (401 without token)")
            
        except Exception as e:
            print(f"✗ Admin delete without auth test failed: {str(e)}")
            raise
    
    def test_admin_delete_nonexistent_review(self):
        """Test DELETE /api/admin/reviews/{id} with nonexistent ID returns 404"""
        try:
            # Login as admin
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=10
            )
            assert login_response.status_code == 200
            token = login_response.json()["token"]
            
            # Try to delete nonexistent review
            response = requests.delete(
                f"{BASE_URL}/api/admin/reviews/nonexistent-review-12345",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            print(f"✓ DELETE nonexistent review status: {response.status_code}")
            assert response.status_code == 404, "Expected 404 for nonexistent review"
            
            print(f"✓ Deleting nonexistent review returns 404")
            
        except Exception as e:
            print(f"✗ Delete nonexistent review test failed: {str(e)}")
            raise
    
    def test_admin_delete_review_updates_rating(self):
        """Test that deleting a review recalculates avg_rating and review_count"""
        try:
            # Login as admin
            login_response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
                timeout=10
            )
            token = login_response.json()["token"]
            
            # Get a location
            list_response = requests.get(f"{BASE_URL}/api/locations", timeout=10)
            locations = list_response.json()
            location_id = locations[0]['id']
            
            # Create 2 reviews
            requests.post(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                json={"author_name": "TEST_A", "stars": 5},
                timeout=10
            )
            review2_response = requests.post(
                f"{BASE_URL}/api/locations/{location_id}/reviews",
                json={"author_name": "TEST_B", "stars": 3},
                timeout=10
            )
            review2_id = review2_response.json()["id"]
            
            time.sleep(0.5)
            
            # Get state before delete
            before_response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            before = before_response.json()
            before_count = before.get('review_count', 0)
            
            print(f"✓ Before delete: review_count={before_count}")
            
            # Delete one review
            requests.delete(
                f"{BASE_URL}/api/admin/reviews/{review2_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=10
            )
            
            time.sleep(0.5)
            
            # Get state after delete
            after_response = requests.get(f"{BASE_URL}/api/locations/{location_id}", timeout=10)
            after = after_response.json()
            after_count = after.get('review_count', 0)
            
            print(f"✓ After delete: review_count={after_count}")
            
            # Verify count decreased
            assert after_count == before_count - 1, f"Expected review_count to decrease by 1"
            
            print(f"✓ Deleting review updates rating aggregation")
            
        except Exception as e:
            print(f"✗ Delete review rating update test failed: {str(e)}")
            raise


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
