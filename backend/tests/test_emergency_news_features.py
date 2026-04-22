"""
Tests for new features: Emergency Contacts CRUD + News CRUD
Covers GET/POST/PUT/DELETE for both emergency-contacts and news APIs
Admin auth required for write operations
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def admin_token():
    """Login as admin and return token"""
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@gradacac.ba",
        "password": "Gradacac2024!"
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    token = resp.json().get("token")
    assert token, "No token returned"
    return token


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ===== Emergency Contacts =====

class TestEmergencyContactsPublic:
    """Public read of emergency contacts"""

    def test_get_emergency_contacts_returns_list(self):
        """GET /api/emergency-contacts should return a list"""
        resp = requests.get(f"{BASE_URL}/api/emergency-contacts")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Got {len(data)} emergency contacts")

    def test_get_emergency_contacts_count_13(self):
        """Should return exactly 13 seeded contacts"""
        resp = requests.get(f"{BASE_URL}/api/emergency-contacts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 13, f"Expected >= 13 contacts, got {len(data)}"
        print(f"PASS: Got {len(data)} contacts (>=13)")

    def test_get_emergency_contacts_fields(self):
        """Each contact should have required fields"""
        resp = requests.get(f"{BASE_URL}/api/emergency-contacts")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0, "No contacts returned"
        c = data[0]
        for field in ['id', 'section', 'name', 'number']:
            assert field in c, f"Missing field: {field}"
        assert '_id' not in c, "MongoDB _id should be excluded"
        print(f"PASS: Contact fields validated - {list(c.keys())}")

    def test_emergency_contacts_has_112(self):
        """Should include the universal 112 emergency number"""
        resp = requests.get(f"{BASE_URL}/api/emergency-contacts")
        assert resp.status_code == 200
        data = resp.json()
        numbers = [c['number'] for c in data]
        assert '112' in numbers, f"112 not found in {numbers[:5]}"
        print("PASS: 112 emergency contact found")

    def test_emergency_contacts_grouped_by_section(self):
        """Should have at least 4 sections"""
        resp = requests.get(f"{BASE_URL}/api/emergency-contacts")
        assert resp.status_code == 200
        data = resp.json()
        sections = set(c['section'] for c in data)
        assert len(sections) >= 4, f"Expected >= 4 sections, got {len(sections)}: {sections}"
        print(f"PASS: Sections found: {sections}")


class TestEmergencyContactsAdminCRUD:
    """Admin CRUD for emergency contacts"""

    created_id = None

    def test_create_contact_requires_auth(self):
        """POST without auth should return 401 or 403"""
        resp = requests.post(f"{BASE_URL}/api/admin/emergency-contacts", json={
            "section": "Test Section", "name": "TEST_Contact", "number": "999"
        })
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: Unauthenticated create blocked")

    def test_create_emergency_contact(self, auth_headers):
        """POST /api/admin/emergency-contacts should create new contact"""
        payload = {
            "section": "Ostale Usluge",
            "section_emoji": "📞",
            "name": "TEST_Emergency_Contact",
            "number": "999-TEST",
            "icon": "call",
            "color": "#3B82F6",
            "bg": "#EFF6FF",
            "note": "Test contact - safe to delete",
            "order": 99
        }
        resp = requests.post(f"{BASE_URL}/api/admin/emergency-contacts", json=payload, headers=auth_headers)
        assert resp.status_code == 200, f"Create failed: {resp.text}"
        data = resp.json()
        assert data['name'] == payload['name']
        assert data['number'] == payload['number']
        assert 'id' in data
        assert '_id' not in data
        TestEmergencyContactsAdminCRUD.created_id = data['id']
        print(f"PASS: Created contact with id={data['id']}")

    def test_created_contact_appears_in_list(self, auth_headers):
        """Created contact should be visible in GET"""
        if not TestEmergencyContactsAdminCRUD.created_id:
            pytest.skip("No created_id available")
        resp = requests.get(f"{BASE_URL}/api/emergency-contacts")
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.json()]
        assert TestEmergencyContactsAdminCRUD.created_id in ids, "Created contact not in list"
        print("PASS: Created contact visible in list")

    def test_update_emergency_contact(self, auth_headers):
        """PUT /api/admin/emergency-contacts/{id} should update"""
        if not TestEmergencyContactsAdminCRUD.created_id:
            pytest.skip("No created_id available")
        cid = TestEmergencyContactsAdminCRUD.created_id
        resp = requests.put(f"{BASE_URL}/api/admin/emergency-contacts/{cid}",
                            json={"note": "Updated by test"}, headers=auth_headers)
        assert resp.status_code == 200, f"Update failed: {resp.text}"
        data = resp.json()
        assert data['note'] == "Updated by test"
        print(f"PASS: Updated contact {cid}")

    def test_update_nonexistent_contact(self, auth_headers):
        """PUT non-existent id should return 404"""
        resp = requests.put(f"{BASE_URL}/api/admin/emergency-contacts/nonexistent-id-12345",
                            json={"note": "test"}, headers=auth_headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("PASS: Non-existent contact returns 404 on update")

    def test_delete_emergency_contact(self, auth_headers):
        """DELETE /api/admin/emergency-contacts/{id} should delete"""
        if not TestEmergencyContactsAdminCRUD.created_id:
            pytest.skip("No created_id available")
        cid = TestEmergencyContactsAdminCRUD.created_id
        resp = requests.delete(f"{BASE_URL}/api/admin/emergency-contacts/{cid}", headers=auth_headers)
        assert resp.status_code == 200, f"Delete failed: {resp.text}"
        print(f"PASS: Deleted contact {cid}")

    def test_deleted_contact_not_in_list(self, auth_headers):
        """Deleted contact should NOT appear in list"""
        if not TestEmergencyContactsAdminCRUD.created_id:
            pytest.skip("No created_id available")
        resp = requests.get(f"{BASE_URL}/api/emergency-contacts")
        assert resp.status_code == 200
        ids = [c['id'] for c in resp.json()]
        assert TestEmergencyContactsAdminCRUD.created_id not in ids, "Deleted contact still in list!"
        print("PASS: Deleted contact no longer in list")

    def test_delete_nonexistent_contact(self, auth_headers):
        """DELETE non-existent id should return 404"""
        resp = requests.delete(f"{BASE_URL}/api/admin/emergency-contacts/nonexistent-id-12345",
                               headers=auth_headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("PASS: Non-existent contact returns 404 on delete")


# ===== News =====

class TestNewsPublic:
    """Public read of news articles"""

    def test_get_news_returns_list(self):
        """GET /api/news should return a list"""
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}"
        print(f"PASS: Got {len(data)} news articles")

    def test_get_news_count_4(self):
        """Should return at least 4 seeded articles"""
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 4, f"Expected >= 4 articles, got {len(data)}"
        print(f"PASS: Got {len(data)} articles (>=4)")

    def test_get_news_fields(self):
        """Each article should have required fields"""
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0, "No articles returned"
        a = data[0]
        for field in ['id', 'title', 'content', 'category', 'is_published', 'created_at']:
            assert field in a, f"Missing field: {field}"
        assert '_id' not in a, "MongoDB _id should be excluded"
        print(f"PASS: Article fields validated - {list(a.keys())}")

    def test_get_news_published_only(self):
        """Default filter should only return published articles"""
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200
        data = resp.json()
        for a in data:
            assert a['is_published'] == True, f"Unpublished article returned: {a['title']}"
        print("PASS: All returned articles are published")

    def test_get_news_all_with_param(self):
        """published_only=false should return all articles"""
        resp = requests.get(f"{BASE_URL}/api/news?published_only=false")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        print(f"PASS: published_only=false returns {len(data)} articles")

    def test_get_news_categories(self):
        """Should include articles from different categories"""
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200
        data = resp.json()
        categories = set(a['category'] for a in data)
        assert len(categories) >= 2, f"Expected >= 2 categories, got {categories}"
        print(f"PASS: Categories found: {categories}")


class TestNewsAdminCRUD:
    """Admin CRUD for news articles"""

    created_id = None

    def test_create_news_requires_auth(self):
        """POST without auth should return 401 or 403"""
        resp = requests.post(f"{BASE_URL}/api/admin/news", json={
            "title": "TEST_News", "content": "Test content"
        })
        assert resp.status_code in [401, 403], f"Expected 401/403, got {resp.status_code}"
        print("PASS: Unauthenticated create blocked")

    def test_create_news_article(self, auth_headers):
        """POST /api/admin/news should create new article"""
        payload = {
            "title": "TEST_News_Article_Pytest",
            "content": "This is a test article created by pytest. Safe to delete.",
            "category": "Vijesti",
            "is_published": True
        }
        resp = requests.post(f"{BASE_URL}/api/admin/news", json=payload, headers=auth_headers)
        assert resp.status_code == 200, f"Create failed: {resp.text}"
        data = resp.json()
        assert data['title'] == payload['title']
        assert data['content'] == payload['content']
        assert data['category'] == payload['category']
        assert 'id' in data
        assert '_id' not in data
        TestNewsAdminCRUD.created_id = data['id']
        print(f"PASS: Created news article with id={data['id']}")

    def test_created_article_appears_in_list(self):
        """Created article should be visible in GET"""
        if not TestNewsAdminCRUD.created_id:
            pytest.skip("No created_id available")
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200
        ids = [a['id'] for a in resp.json()]
        assert TestNewsAdminCRUD.created_id in ids, "Created article not in list"
        print("PASS: Created article visible in list")

    def test_update_news_article(self, auth_headers):
        """PUT /api/admin/news/{id} should update"""
        if not TestNewsAdminCRUD.created_id:
            pytest.skip("No created_id available")
        nid = TestNewsAdminCRUD.created_id
        resp = requests.put(f"{BASE_URL}/api/admin/news/{nid}",
                            json={"content": "Updated content by test"}, headers=auth_headers)
        assert resp.status_code == 200, f"Update failed: {resp.text}"
        data = resp.json()
        assert data['content'] == "Updated content by test"
        print(f"PASS: Updated article {nid}")

    def test_update_nonexistent_article(self, auth_headers):
        """PUT non-existent id should return 404"""
        resp = requests.put(f"{BASE_URL}/api/admin/news/nonexistent-id-12345",
                            json={"content": "test"}, headers=auth_headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("PASS: Non-existent article returns 404 on update")

    def test_delete_news_article(self, auth_headers):
        """DELETE /api/admin/news/{id} should delete"""
        if not TestNewsAdminCRUD.created_id:
            pytest.skip("No created_id available")
        nid = TestNewsAdminCRUD.created_id
        resp = requests.delete(f"{BASE_URL}/api/admin/news/{nid}", headers=auth_headers)
        assert resp.status_code == 200, f"Delete failed: {resp.text}"
        print(f"PASS: Deleted article {nid}")

    def test_deleted_article_not_in_list(self):
        """Deleted article should NOT appear in list"""
        if not TestNewsAdminCRUD.created_id:
            pytest.skip("No created_id available")
        resp = requests.get(f"{BASE_URL}/api/news")
        assert resp.status_code == 200
        ids = [a['id'] for a in resp.json()]
        assert TestNewsAdminCRUD.created_id not in ids, "Deleted article still in list!"
        print("PASS: Deleted article no longer in list")

    def test_delete_nonexistent_article(self, auth_headers):
        """DELETE non-existent id should return 404"""
        resp = requests.delete(f"{BASE_URL}/api/admin/news/nonexistent-id-12345",
                               headers=auth_headers)
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("PASS: Non-existent article returns 404 on delete")

    def test_create_news_unpublished(self, auth_headers):
        """Create unpublished article - should not appear in default GET"""
        payload = {
            "title": "TEST_Hidden_Article",
            "content": "Hidden test content.",
            "category": "Ostalo",
            "is_published": False
        }
        resp = requests.post(f"{BASE_URL}/api/admin/news", json=payload, headers=auth_headers)
        assert resp.status_code == 200
        nid = resp.json()['id']

        # Default get should not include it
        public_resp = requests.get(f"{BASE_URL}/api/news")
        pub_ids = [a['id'] for a in public_resp.json()]
        assert nid not in pub_ids, "Unpublished article visible in default list"

        # published_only=false should include it
        all_resp = requests.get(f"{BASE_URL}/api/news?published_only=false")
        all_ids = [a['id'] for a in all_resp.json()]
        assert nid in all_ids, "Unpublished article not visible with published_only=false"

        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/news/{nid}", headers=auth_headers)
        print("PASS: Unpublished article visibility works correctly")
