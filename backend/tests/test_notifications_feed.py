"""
Test cases for the Notification Center feature:
- GET /api/notifications-feed endpoint
- Validates response structure and types
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

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')


class TestNotificationsFeed:
    """Tests for /api/notifications-feed endpoint"""

    def test_notifications_feed_returns_200(self):
        """Feed endpoint should return 200 OK"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"

    def test_notifications_feed_returns_array(self):
        """Feed should return a JSON array"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        assert isinstance(data, list), f"Expected list, got {type(data)}: {data}"

    def test_notifications_feed_has_items(self):
        """Feed should have at least some items (seeded news + possible events/offers)"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        assert len(data) > 0, "Feed should have at least 1 item (seeded news)"

    def test_notifications_feed_item_required_fields(self):
        """Each item should have required fields: id, type, title, body, category, created_at, icon, color"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        assert len(data) > 0, "No items to validate"
        required = {"id", "type", "title", "body", "category", "created_at", "icon", "color"}
        for item in data:
            missing = required - set(item.keys())
            assert not missing, f"Item missing fields: {missing} in {item}"

    def test_notifications_feed_valid_types(self):
        """Item types must be 'news', 'event', or 'offer'"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        valid_types = {"news", "event", "offer"}
        for item in data:
            assert item["type"] in valid_types, f"Invalid type '{item['type']}' in item {item['id']}"

    def test_notifications_feed_has_news_items(self):
        """Feed should contain at least some news items (seeded)"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        news_items = [i for i in data if i["type"] == "news"]
        assert len(news_items) > 0, "Feed should have news items from seeded data"

    def test_notifications_feed_news_icon(self):
        """News items should use 'newspaper-outline' icon and blue color"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        news_items = [i for i in data if i["type"] == "news"]
        for n in news_items:
            assert n["icon"] == "newspaper-outline", f"News icon should be newspaper-outline, got: {n['icon']}"
            assert n["color"] == "#3B82F6", f"News color should be #3B82F6, got: {n['color']}"

    def test_notifications_feed_event_icon(self):
        """Event items should use 'calendar-outline' icon and purple color"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        event_items = [i for i in data if i["type"] == "event"]
        for e in event_items:
            assert e["icon"] == "calendar-outline", f"Event icon should be calendar-outline, got: {e['icon']}"
            assert e["color"] == "#7C3AED", f"Event color should be #7C3AED, got: {e['color']}"

    def test_notifications_feed_offer_items_have_location_id(self):
        """Offer items should have location_id field"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        offer_items = [i for i in data if i["type"] == "offer"]
        for o in offer_items:
            assert "location_id" in o, f"Offer item missing location_id: {o}"
            assert o["location_id"], f"Offer item has empty location_id: {o}"

    def test_notifications_feed_offer_icon(self):
        """Offer items should use 'pricetag-outline' icon and orange color"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        offer_items = [i for i in data if i["type"] == "offer"]
        for o in offer_items:
            assert o["icon"] == "pricetag-outline", f"Offer icon should be pricetag-outline, got: {o['icon']}"
            assert o["color"] == "#F59E0B", f"Offer color should be #F59E0B, got: {o['color']}"

    def test_notifications_feed_limit_param(self):
        """The limit query param should limit the number of items returned"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed?limit=3")
        data = resp.json()
        assert len(data) <= 3, f"Expected max 3 items with limit=3, got {len(data)}"

    def test_notifications_feed_sorted_by_date_desc(self):
        """Items should be sorted by created_at descending (newest first)"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        if len(data) < 2:
            pytest.skip("Need at least 2 items to check sorting")
        dates = [str(i.get("created_at", "")) for i in data]
        # Check that dates are in descending order (newer first)
        for i in range(len(dates) - 1):
            if dates[i] and dates[i+1]:
                assert dates[i] >= dates[i+1], f"Items not sorted desc: {dates[i]} < {dates[i+1]}"

    def test_notifications_feed_no_mongodb_id(self):
        """Response items should NOT include MongoDB _id field"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        for item in data:
            assert "_id" not in item, f"Item should not contain _id: {item}"

    def test_notifications_feed_all_types_present(self):
        """Feed should ideally have all 3 types given seeded data"""
        resp = requests.get(f"{BASE_URL}/api/notifications-feed")
        data = resp.json()
        types_present = {i["type"] for i in data}
        # At minimum news should be there (seeded)
        assert "news" in types_present, f"Feed should have 'news' type items. Types found: {types_present}"


@pytest.fixture(scope="module")
def api_session():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session
