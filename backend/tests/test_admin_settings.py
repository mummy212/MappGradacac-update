"""
Backend tests for admin settings feature
Tests GET /api/settings and PUT /api/admin/settings
"""
import pytest
import requests
import os
from pathlib import Path

# Load EXPO_PUBLIC_BACKEND_URL from frontend/.env
frontend_env = Path(__file__).parent.parent.parent / 'frontend' / '.env'
if frontend_env.exists():
    with open(frontend_env) as f:
        for line in f:
            if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break
else:
    BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001').rstrip('/')

class TestAdminSettings:
    """Admin settings endpoint tests"""

    def test_get_settings_public(self):
        """GET /api/settings should be public (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["id"] == "main"
        assert "paypal_link" in data
        assert "contact_email" in data
        print("✓ GET /api/settings returns settings (public endpoint)")

    def test_update_settings_without_auth(self):
        """PUT /api/admin/settings should require auth"""
        response = requests.put(f"{BASE_URL}/api/admin/settings", json={
            "paypal_link": "https://paypal.me/TestUser",
            "contact_email": "test@example.com"
        })
        assert response.status_code == 401
        print("✓ PUT /api/admin/settings requires authentication (401 without auth)")

    def test_update_settings_with_admin_auth(self):
        """PUT /api/admin/settings should work with admin auth"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gradacac.ba",
            "password": "Gradacac2024!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        print("✓ Admin login successful")

        # Update settings
        update_response = requests.put(f"{BASE_URL}/api/admin/settings", json={
            "paypal_link": "https://paypal.me/GradacacMapa",
            "contact_email": "admin@gradacac-mapa.ba"
        }, headers={"Authorization": f"Bearer {token}"})
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["paypal_link"] == "https://paypal.me/GradacacMapa"
        assert data["contact_email"] == "admin@gradacac-mapa.ba"
        print("✓ PUT /api/admin/settings updates settings successfully")

        # Verify persistence with GET
        get_response = requests.get(f"{BASE_URL}/api/settings")
        assert get_response.status_code == 200
        get_data = get_response.json()
        assert get_data["paypal_link"] == "https://paypal.me/GradacacMapa"
        assert get_data["contact_email"] == "admin@gradacac-mapa.ba"
        print("✓ GET /api/settings returns updated settings (data persisted)")

    def test_update_settings_partial(self):
        """PUT /api/admin/settings should allow partial updates"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gradacac.ba",
            "password": "Gradacac2024!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]

        # Update only paypal_link
        update_response = requests.put(f"{BASE_URL}/api/admin/settings", json={
            "paypal_link": "https://paypal.me/NewLink"
        }, headers={"Authorization": f"Bearer {token}"})
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["paypal_link"] == "https://paypal.me/NewLink"
        # contact_email should remain from previous test
        assert "contact_email" in data
        print("✓ PUT /api/admin/settings allows partial updates")

    def test_update_settings_empty_data(self):
        """PUT /api/admin/settings should reject empty data"""
        # Login as admin
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@gradacac.ba",
            "password": "Gradacac2024!"
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]

        # Try to update with empty data
        update_response = requests.put(f"{BASE_URL}/api/admin/settings", json={},
            headers={"Authorization": f"Bearer {token}"})
        
        assert update_response.status_code == 400
        assert "No data to update" in update_response.json()["detail"]
        print("✓ PUT /api/admin/settings rejects empty data (400)")

    def test_settings_default_values(self):
        """GET /api/settings should return default values if not set"""
        # This test assumes settings might be empty initially
        # Just verify the structure is correct
        response = requests.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "paypal_link" in data
        assert "contact_email" in data
        # Default contact_email should be set
        if not data["paypal_link"]:
            assert data["contact_email"] == "info@gradacac-mapa.ba" or data["contact_email"] != ""
        print("✓ GET /api/settings returns proper structure with defaults")
