"""
SEO Features Tests
Tests for: sitemap.xml, robots.txt, admin panel SEO settings
"""
import pytest
import requests
import os
import xml.etree.ElementTree as ET

BASE_URL = os.environ.get('EXPO_BACKEND_URL', '').rstrip('/')


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@gradacac.ba",
        "password": "Gradacac2024!"
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    return data.get("token") or data.get("access_token")


@pytest.fixture(scope="module")
def auth_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


# ===== Sitemap.xml Tests =====
class TestSitemapXML:
    """Tests for /api/sitemap.xml endpoint"""

    def test_sitemap_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: sitemap.xml returns 200")

    def test_sitemap_content_type_xml(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert 'xml' in response.headers.get('content-type', '').lower(), \
            f"Expected XML content type, got: {response.headers.get('content-type')}"
        print("PASS: sitemap.xml has XML content type")

    def test_sitemap_valid_xml_structure(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        assert response.status_code == 200
        try:
            root = ET.fromstring(response.content)
            assert root.tag.endswith('urlset'), f"Root tag should be urlset, got: {root.tag}"
            print("PASS: sitemap.xml has valid XML structure with urlset root")
        except ET.ParseError as e:
            pytest.fail(f"sitemap.xml is not valid XML: {e}")

    def test_sitemap_has_urls(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        content = response.text
        url_count = content.count('<loc>')
        assert url_count > 0, "Sitemap should have at least one URL"
        print(f"PASS: sitemap.xml has {url_count} URLs")

    def test_sitemap_contains_static_pages(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        content = response.text
        # Check key static pages exist
        expected_paths = ['/vijesti', '/dogadjaji', '/lokacije', '/znamenitosti']
        for path in expected_paths:
            assert path in content, f"Expected path {path} not found in sitemap"
        print("PASS: sitemap.xml contains all static pages")

    def test_sitemap_contains_dynamic_locations(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        content = response.text
        assert '/lokacije/' in content, "Sitemap should contain dynamic location URLs"
        print("PASS: sitemap.xml contains dynamic location URLs")

    def test_sitemap_contains_dynamic_news(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        content = response.text
        assert '/vijesti/' in content, "Sitemap should contain dynamic news URLs"
        print("PASS: sitemap.xml contains dynamic news URLs")

    def test_sitemap_contains_dynamic_events(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        content = response.text
        assert '/dogadjaji/' in content, "Sitemap should contain dynamic event URLs"
        print("PASS: sitemap.xml contains dynamic event URLs")

    def test_sitemap_contains_dynamic_attractions(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        content = response.text
        assert '/znamenitosti/' in content, "Sitemap should contain dynamic attraction URLs"
        print("PASS: sitemap.xml contains dynamic attraction URLs")

    def test_sitemap_has_valid_url_entries(self):
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        root = ET.fromstring(response.content)
        # Check namespaces
        ns = {'sm': 'http://www.sitemaps.org/schemas/sitemap/0.9'}
        urls = root.findall('sm:url', ns)
        if not urls:
            # Try without namespace
            urls = root.findall('url')
        assert len(urls) > 7, f"Expected more than 7 URLs, got {len(urls)}"
        # Each URL should have loc, lastmod, changefreq, priority
        for url in urls[:3]:
            children_tags = [child.tag.split('}')[-1] for child in url]
            assert 'loc' in children_tags, "Each URL entry must have <loc>"
        print(f"PASS: sitemap.xml has {len(urls)} valid URL entries with loc element")


# ===== Robots.txt Tests =====
class TestRobotsTxt:
    """Tests for /api/robots.txt endpoint"""

    def test_robots_returns_200(self):
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("PASS: robots.txt returns 200")

    def test_robots_content_type_text(self):
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        content_type = response.headers.get('content-type', '')
        assert 'text' in content_type.lower(), f"Expected text content type, got: {content_type}"
        print("PASS: robots.txt has text content type")

    def test_robots_has_user_agent(self):
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        assert 'User-agent:' in response.text, "robots.txt must have User-agent directive"
        print("PASS: robots.txt has User-agent directive")

    def test_robots_has_sitemap_link(self):
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        assert 'Sitemap:' in response.text, "robots.txt must have Sitemap link"
        assert 'sitemap.xml' in response.text, "robots.txt Sitemap link must point to sitemap.xml"
        print("PASS: robots.txt has Sitemap link")

    def test_robots_allows_city_pages(self):
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        content = response.text
        assert 'Allow: /api/city/' in content, "robots.txt should allow /api/city/"
        print("PASS: robots.txt allows /api/city/")

    def test_robots_disallows_admin_panel(self):
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        content = response.text
        assert 'Disallow: /api/admin-panel/' in content, "robots.txt should disallow /api/admin-panel/"
        print("PASS: robots.txt disallows /api/admin-panel/")

    def test_robots_disallows_admin_api(self):
        response = requests.get(f"{BASE_URL}/api/robots.txt")
        content = response.text
        assert 'Disallow: /api/admin/' in content, "robots.txt should disallow /api/admin/"
        print("PASS: robots.txt disallows /api/admin/")


# ===== Admin SEO Settings Tests =====
class TestAdminSEOSettings:
    """Tests for admin panel SEO settings via API"""

    def test_get_seo_settings_requires_auth(self):
        response = requests.get(f"{BASE_URL}/api/admin/site-settings")
        assert response.status_code in [401, 403], \
            f"Expected 401/403 without auth, got {response.status_code}"
        print("PASS: Admin SEO settings requires authentication")

    def test_get_seo_settings_with_auth(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print("PASS: Admin SEO settings accessible with auth")

    def test_seo_settings_has_google_verification_field(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers)
        data = response.json()
        assert 'google_verification' in data, "SEO settings must include google_verification field"
        print(f"PASS: google_verification field exists: {repr(data.get('google_verification'))}")

    def test_seo_settings_has_google_analytics_id_field(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers)
        data = response.json()
        assert 'google_analytics_id' in data, "SEO settings must include google_analytics_id field"
        print(f"PASS: google_analytics_id field exists: {repr(data.get('google_analytics_id'))}")

    def test_seo_settings_has_canonical_site_url_field(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers)
        data = response.json()
        assert 'site_url' in data, "SEO settings must include site_url (canonical URL) field"
        print(f"PASS: site_url field exists: {repr(data.get('site_url'))}")

    def test_seo_settings_has_meta_title_field(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers)
        data = response.json()
        assert 'meta_title' in data and data['meta_title'], "SEO settings must include non-empty meta_title"
        print(f"PASS: meta_title field: {repr(data.get('meta_title'))}")

    def test_seo_settings_has_meta_description_field(self, auth_headers):
        response = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers)
        data = response.json()
        assert 'meta_description' in data and data['meta_description'], \
            "SEO settings must include non-empty meta_description"
        print(f"PASS: meta_description exists: {repr(data.get('meta_description')[:60])}...")

    def test_update_seo_settings(self, auth_headers):
        """Test that SEO settings can be updated"""
        update_payload = {
            "google_verification": "TEST_verification_code_123",
            "google_analytics_id": "G-TEST12345",
            "site_url": "https://gradacac-mapa.ba"
        }
        response = requests.put(
            f"{BASE_URL}/api/admin/site-settings",
            headers=auth_headers,
            json=update_payload
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") is True, f"Expected ok=True, got: {data}"
        print("PASS: SEO settings updated successfully")

    def test_updated_seo_settings_persisted(self, auth_headers):
        """Verify updated SEO settings are persisted"""
        response = requests.get(f"{BASE_URL}/api/admin/site-settings", headers=auth_headers)
        data = response.json()
        assert data.get('google_verification') == "TEST_verification_code_123", \
            f"Expected TEST_verification_code_123, got {data.get('google_verification')}"
        assert data.get('google_analytics_id') == "G-TEST12345", \
            f"Expected G-TEST12345, got {data.get('google_analytics_id')}"
        print("PASS: SEO settings persisted correctly")

    def test_sitemap_uses_canonical_url_after_setting(self, auth_headers):
        """After setting site_url, sitemap should use it"""
        # Set canonical URL
        requests.put(
            f"{BASE_URL}/api/admin/site-settings",
            headers=auth_headers,
            json={"site_url": "https://gradacac-mapa.ba"}
        )
        response = requests.get(f"{BASE_URL}/api/sitemap.xml")
        content = response.text
        assert 'gradacac-mapa.ba' in content, \
            "Sitemap should use the canonical site_url after it's set"
        print("PASS: Sitemap uses canonical URL from settings")

    def test_cleanup_seo_settings(self, auth_headers):
        """Reset test SEO settings"""
        requests.put(
            f"{BASE_URL}/api/admin/site-settings",
            headers=auth_headers,
            json={
                "google_verification": "",
                "google_analytics_id": "",
                "site_url": ""
            }
        )
        print("INFO: Test SEO settings cleaned up")


# ===== News Item API Tests for SEO Content =====
class TestNewsItemForSEO:
    """Tests for news item API - needed to verify SEO content generation"""

    def test_news_item_exists(self):
        """Test the specific news item used in frontend SEO testing"""
        news_id = "e4c0a139-b14b-4411-bb4a-7b1021385d6f"
        response = requests.get(f"{BASE_URL}/api/news/{news_id}")
        assert response.status_code == 200, f"News item {news_id} not found"
        data = response.json()
        assert data.get('title'), "News item must have a title"
        print(f"PASS: News item found: {data.get('title')[:60]}")

    def test_news_item_has_seo_fields(self):
        """Verify news item has fields needed for SEO"""
        news_id = "e4c0a139-b14b-4411-bb4a-7b1021385d6f"
        response = requests.get(f"{BASE_URL}/api/news/{news_id}")
        data = response.json()
        required_fields = ['title', 'id', 'created_at', 'category']
        for field in required_fields:
            assert field in data, f"News item missing required field: {field}"
        print(f"PASS: News item has all SEO-required fields")

    def test_news_list_returns_items(self):
        response = requests.get(f"{BASE_URL}/api/news")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list) and len(data) > 0, "News list should have items"
        print(f"PASS: News list has {len(data)} items")
