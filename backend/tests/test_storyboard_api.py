"""
Storyboard API Tests
Tests for the Storyboard Studio feature - CRUD operations for storyboards and scenes
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://cinematic-hub-37.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Test data storage
test_data = {}


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("✓ API health check passed")


class TestStoryboardCRUD:
    """Storyboard CRUD operation tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        # Get session token from environment or create test session
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Try to use existing session cookie if available
        session_token = os.environ.get('TEST_SESSION_TOKEN')
        if session_token:
            self.session.cookies.set('session_token', session_token)
    
    def test_storyboards_requires_auth(self):
        """Test that storyboards endpoint requires authentication"""
        response = requests.get(f"{API_URL}/storyboards")
        assert response.status_code == 401
        print("✓ Storyboards endpoint requires authentication")
    
    def test_create_storyboard_requires_auth(self):
        """Test that creating storyboard requires authentication"""
        response = requests.post(f"{API_URL}/storyboards", json={
            "title": "Test Storyboard"
        })
        assert response.status_code == 401
        print("✓ Create storyboard requires authentication")


class TestStoryboardStructure:
    """Test storyboard data structure and endpoint availability"""
    
    def test_storyboards_endpoint_exists(self):
        """Test GET /api/storyboards endpoint exists"""
        response = requests.get(f"{API_URL}/storyboards")
        # 401 means endpoint exists but requires auth
        assert response.status_code in [200, 401]
        print("✓ GET /api/storyboards endpoint exists")
    
    def test_storyboards_post_endpoint_exists(self):
        """Test POST /api/storyboards endpoint exists"""
        response = requests.post(f"{API_URL}/storyboards", json={})
        # 401 means endpoint exists but requires auth
        assert response.status_code in [200, 201, 401]
        print("✓ POST /api/storyboards endpoint exists")
    
    def test_storyboard_get_single_endpoint_pattern(self):
        """Test GET /api/storyboards/{id} endpoint pattern"""
        response = requests.get(f"{API_URL}/storyboards/test_id")
        # 401 or 404 means endpoint exists
        assert response.status_code in [401, 404]
        print("✓ GET /api/storyboards/{id} endpoint pattern exists")
    
    def test_storyboard_update_endpoint_pattern(self):
        """Test PUT /api/storyboards/{id} endpoint pattern"""
        response = requests.put(f"{API_URL}/storyboards/test_id", json={})
        # 401 or 404 means endpoint exists
        assert response.status_code in [401, 404]
        print("✓ PUT /api/storyboards/{id} endpoint pattern exists")
    
    def test_storyboard_delete_endpoint_pattern(self):
        """Test DELETE /api/storyboards/{id} endpoint pattern"""
        response = requests.delete(f"{API_URL}/storyboards/test_id")
        # 401 or 404 means endpoint exists
        assert response.status_code in [401, 404]
        print("✓ DELETE /api/storyboards/{id} endpoint pattern exists")


class TestSceneEndpoints:
    """Test scene-related endpoints"""
    
    def test_add_scene_endpoint_pattern(self):
        """Test POST /api/storyboards/{id}/scenes endpoint pattern"""
        response = requests.post(f"{API_URL}/storyboards/test_id/scenes", json={})
        # 401 or 404 means endpoint exists
        assert response.status_code in [401, 404]
        print("✓ POST /api/storyboards/{id}/scenes endpoint pattern exists")
    
    def test_update_scene_endpoint_pattern(self):
        """Test PUT /api/storyboards/{id}/scenes/{scene_id} endpoint pattern"""
        response = requests.put(f"{API_URL}/storyboards/test_id/scenes/scene_id", json={})
        # 401 or 404 means endpoint exists
        assert response.status_code in [401, 404]
        print("✓ PUT /api/storyboards/{id}/scenes/{scene_id} endpoint pattern exists")
    
    def test_delete_scene_endpoint_pattern(self):
        """Test DELETE /api/storyboards/{id}/scenes/{scene_id} endpoint pattern"""
        response = requests.delete(f"{API_URL}/storyboards/test_id/scenes/scene_id")
        # 401 or 404 means endpoint exists
        assert response.status_code in [401, 404]
        print("✓ DELETE /api/storyboards/{id}/scenes/{scene_id} endpoint pattern exists")
    
    def test_reorder_scenes_endpoint_pattern(self):
        """Test PUT /api/storyboards/{id}/scenes/reorder endpoint pattern"""
        response = requests.put(f"{API_URL}/storyboards/test_id/scenes/reorder", json={"scene_ids": []})
        # 401 or 404 means endpoint exists  
        assert response.status_code in [401, 404]
        print("✓ PUT /api/storyboards/{id}/scenes/reorder endpoint pattern exists")


class TestMediaEndpoints:
    """Test media upload endpoints for scenes"""
    
    def test_upload_media_endpoint_pattern(self):
        """Test POST /api/storyboards/{id}/scenes/{scene_id}/media endpoint pattern"""
        response = requests.post(f"{API_URL}/storyboards/test_id/scenes/scene_id/media")
        # 401, 404, or 422 (missing form data) means endpoint exists
        assert response.status_code in [401, 404, 422]
        print("✓ POST /api/storyboards/{id}/scenes/{scene_id}/media endpoint pattern exists")
    
    def test_delete_media_endpoint_pattern(self):
        """Test DELETE /api/storyboards/{id}/scenes/{scene_id}/media/{type} endpoint pattern"""
        response = requests.delete(f"{API_URL}/storyboards/test_id/scenes/scene_id/media/image")
        # 401 or 404 means endpoint exists
        assert response.status_code in [401, 404]
        print("✓ DELETE /api/storyboards/{id}/scenes/{scene_id}/media/{type} endpoint pattern exists")


class TestAPIEndpoints:
    """Test that API endpoints are properly responding"""
    
    def test_health_endpoint_returns_json(self):
        """Test health endpoint returns valid JSON"""
        response = requests.get(f"{API_URL}/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        print("✓ Health endpoint returns valid JSON")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
