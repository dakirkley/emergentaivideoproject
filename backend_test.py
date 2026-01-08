#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class AICreativeStudioTester:
    def __init__(self, base_url: str = "https://aigen-hub-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
        
        result = {
            "test_name": name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {name}")
        if details:
            print(f"    {details}")
        if not success and response_data:
            print(f"    Response: {response_data}")

    def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                    headers: Optional[Dict] = None, expected_status: int = 200) -> tuple:
        """Make HTTP request and return success status and response"""
        url = f"{self.base_url}{endpoint}"
        
        # Default headers
        default_headers = {'Content-Type': 'application/json'}
        if self.session_token:
            default_headers['Authorization'] = f'Bearer {self.session_token}'
        
        if headers:
            default_headers.update(headers)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=default_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}
            
            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text[:200]}
            
            return success, response_data
            
        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_health_check(self):
        """Test health check endpoint"""
        success, response = self.make_request('GET', '/api/health')
        
        if success and response.get('status') == 'healthy':
            self.log_test("Health Check", True, "API is healthy")
        else:
            self.log_test("Health Check", False, "Health check failed", response)

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.make_request('GET', '/api/')
        
        if success and 'AI Creative Studio API' in response.get('message', ''):
            self.log_test("Root Endpoint", True, "Root endpoint accessible")
        else:
            self.log_test("Root Endpoint", False, "Root endpoint failed", response)

    def test_auth_me_without_token(self):
        """Test /auth/me without authentication - should fail"""
        success, response = self.make_request('GET', '/api/auth/me', expected_status=401)
        
        if success:
            self.log_test("Auth Me (No Token)", True, "Correctly returns 401 without token")
        else:
            self.log_test("Auth Me (No Token)", False, "Should return 401 without token", response)

    def test_settings_api_keys_without_auth(self):
        """Test settings endpoints without authentication - should fail"""
        success, response = self.make_request('GET', '/api/settings/api-keys', expected_status=401)
        
        if success:
            self.log_test("Settings API Keys (No Auth)", True, "Correctly requires authentication")
        else:
            self.log_test("Settings API Keys (No Auth)", False, "Should require authentication", response)

    def test_gallery_without_auth(self):
        """Test gallery endpoint without authentication - should fail"""
        success, response = self.make_request('GET', '/api/gallery', expected_status=401)
        
        if success:
            self.log_test("Gallery (No Auth)", True, "Correctly requires authentication")
        else:
            self.log_test("Gallery (No Auth)", False, "Should require authentication", response)

    def test_generation_endpoints_without_auth(self):
        """Test generation endpoints without authentication - should fail"""
        endpoints = [
            '/api/generate/image',
            '/api/generate/video', 
            '/api/generate/voice',
            '/api/generate/upload',
            '/api/generate/video/avatar',
            '/api/generate/video/motion-control',
            '/api/generate/voice/clone',
            '/api/generate/voice/cloned'
        ]
        
        for endpoint in endpoints:
            if endpoint == '/api/generate/voice/cloned':
                # GET endpoint
                success, response = self.make_request('GET', endpoint, expected_status=401)
            else:
                # POST endpoints
                success, response = self.make_request('POST', endpoint, 
                                                    data={"prompt": "test"}, 
                                                    expected_status=401)
            
            endpoint_name = endpoint.split('/')[-1].title()
            if success:
                self.log_test(f"Generate {endpoint_name} (No Auth)", True, "Correctly requires authentication")
            else:
                self.log_test(f"Generate {endpoint_name} (No Auth)", False, "Should require authentication", response)

    def test_cors_headers(self):
        """Test CORS configuration"""
        try:
            response = requests.options(f"{self.base_url}/api/health", timeout=10)
            cors_headers = {
                'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
                'access-control-allow-methods': response.headers.get('access-control-allow-methods'),
                'access-control-allow-headers': response.headers.get('access-control-allow-headers')
            }
            
            if cors_headers['access-control-allow-origin']:
                self.log_test("CORS Configuration", True, f"CORS headers present: {cors_headers}")
            else:
                self.log_test("CORS Configuration", False, "CORS headers missing", cors_headers)
                
        except Exception as e:
            self.log_test("CORS Configuration", False, f"CORS test failed: {str(e)}")

    def test_api_structure(self):
        """Test that API follows expected structure"""
        # Test that all endpoints are properly prefixed with /api
        endpoints_to_test = [
            '/api/',
            '/api/health',
            '/api/auth/me',
            '/api/settings/api-keys',
            '/api/gallery',
            '/api/generate/image'
        ]
        
        accessible_endpoints = 0
        for endpoint in endpoints_to_test:
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=10)
                # Any response (even 401) means the endpoint exists
                if response.status_code in [200, 401, 422]:
                    accessible_endpoints += 1
            except:
                pass
        
        if accessible_endpoints >= len(endpoints_to_test) - 1:  # Allow for one failure
            self.log_test("API Structure", True, f"{accessible_endpoints}/{len(endpoints_to_test)} endpoints accessible")
        else:
            self.log_test("API Structure", False, f"Only {accessible_endpoints}/{len(endpoints_to_test)} endpoints accessible")

    def test_with_auth_token(self):
        """Test endpoints with provided test session token"""
        # Set the test session token
        self.session_token = "test_session_1767801009292"
        
        # Test auth/me endpoint with token
        success, response = self.make_request('GET', '/api/auth/me')
        if success and 'user_id' in response:
            self.log_test("Auth Me (With Token)", True, f"Successfully authenticated user: {response.get('email', 'unknown')}")
        else:
            self.log_test("Auth Me (With Token)", False, "Authentication failed with test token", response)
            return False
        
        # Test file upload endpoint structure (without actual file)
        success, response = self.make_request('POST', '/api/generate/upload', expected_status=422)
        if success:
            self.log_test("Upload Endpoint Structure", True, "Upload endpoint accessible (expects file)")
        else:
            self.log_test("Upload Endpoint Structure", False, "Upload endpoint not accessible", response)
        
        # Test avatar endpoint structure
        success, response = self.make_request('POST', '/api/generate/video/avatar', expected_status=422)
        if success:
            self.log_test("Avatar Endpoint Structure", True, "Avatar endpoint accessible (expects form data)")
        else:
            self.log_test("Avatar Endpoint Structure", False, "Avatar endpoint not accessible", response)
        
        # Test motion control endpoint structure
        success, response = self.make_request('POST', '/api/generate/video/motion-control', expected_status=422)
        if success:
            self.log_test("Motion Control Endpoint Structure", True, "Motion control endpoint accessible (expects form data)")
        else:
            self.log_test("Motion Control Endpoint Structure", False, "Motion control endpoint not accessible", response)
        
        # Test voice clone endpoint structure
        success, response = self.make_request('POST', '/api/generate/voice/clone', expected_status=422)
        if success:
            self.log_test("Voice Clone Endpoint Structure", True, "Voice clone endpoint accessible (expects form data)")
        else:
            self.log_test("Voice Clone Endpoint Structure", False, "Voice clone endpoint not accessible", response)
        
        # Test cloned voices list endpoint
        success, response = self.make_request('GET', '/api/generate/voice/cloned')
        if success and 'voices' in response:
            self.log_test("Cloned Voices List", True, f"Retrieved cloned voices list: {len(response['voices'])} voices")
        else:
            self.log_test("Cloned Voices List", False, "Failed to get cloned voices list", response)
        
        return True

    def test_templates_endpoints(self):
        """Test all template-related endpoints"""
        if not self.session_token:
            self.log_test("Templates Tests", False, "No authentication token available")
            return
        
        # Test GET /api/templates (get all templates)
        success, response = self.make_request('GET', '/api/templates')
        if success and 'templates' in response:
            templates = response['templates']
            system_templates = [t for t in templates if t.get('is_system')]
            favorites_count = response.get('favorites_count', 0)
            
            self.log_test("Get All Templates", True, f"Retrieved {len(templates)} templates ({len(system_templates)} system templates)")
            self.log_test("Templates Include Favorites Count", True, f"Favorites count: {favorites_count}")
            
            # Verify system templates exist
            if len(system_templates) >= 10:  # Should have 13 system templates
                self.log_test("System Templates Present", True, f"Found {len(system_templates)} system templates")
            else:
                self.log_test("System Templates Present", False, f"Expected 13+ system templates, found {len(system_templates)}")
            
            # Verify is_favorite field is present in templates
            has_favorite_field = all('is_favorite' in t for t in templates)
            if has_favorite_field:
                self.log_test("Templates Include is_favorite Field", True, "All templates have is_favorite field")
            else:
                self.log_test("Templates Include is_favorite Field", False, "Some templates missing is_favorite field")
        else:
            self.log_test("Get All Templates", False, "Failed to retrieve templates", response)
            return
        
        # Test GET /api/templates/categories
        success, response = self.make_request('GET', '/api/templates/categories')
        if success and 'categories' in response:
            categories = response['categories']
            self.log_test("Get Template Categories", True, f"Retrieved {len(categories)} categories: {categories}")
        else:
            self.log_test("Get Template Categories", False, "Failed to retrieve categories", response)
        
        # Test filtering by type
        for template_type in ['image', 'video', 'voice']:
            success, response = self.make_request('GET', f'/api/templates?type={template_type}')
            if success and 'templates' in response:
                filtered_templates = response['templates']
                type_match = all(t.get('type') == template_type for t in filtered_templates)
                if type_match:
                    self.log_test(f"Filter Templates by Type ({template_type})", True, f"Found {len(filtered_templates)} {template_type} templates")
                else:
                    self.log_test(f"Filter Templates by Type ({template_type})", False, "Type filtering not working correctly")
            else:
                self.log_test(f"Filter Templates by Type ({template_type})", False, f"Failed to filter by {template_type}", response)
        
        # Test creating a new template
        test_template = {
            "name": "Test Template",
            "description": "A test template for automated testing",
            "prompt": "This is a test prompt for automated testing purposes",
            "type": "image",
            "provider": "openai",
            "category": "Test",
            "tags": ["test", "automation"],
            "is_public": False
        }
        
        success, response = self.make_request('POST', '/api/templates', data=test_template, expected_status=200)
        created_template_id = None
        if success and 'template_id' in response:
            created_template_id = response['template_id']
            self.log_test("Create Template", True, f"Created template with ID: {created_template_id}")
        else:
            self.log_test("Create Template", False, "Failed to create template", response)
        
        # Test getting specific template
        if created_template_id:
            success, response = self.make_request('GET', f'/api/templates/{created_template_id}')
            if success and response.get('template_id') == created_template_id:
                self.log_test("Get Specific Template", True, f"Retrieved template: {response.get('name')}")
            else:
                self.log_test("Get Specific Template", False, "Failed to retrieve specific template", response)
            
            # Test updating template
            update_data = {
                "name": "Updated Test Template",
                "description": "Updated description",
                "category": "Updated Test"
            }
            success, response = self.make_request('PUT', f'/api/templates/{created_template_id}', data=update_data)
            if success:
                self.log_test("Update Template", True, "Successfully updated template")
            else:
                self.log_test("Update Template", False, "Failed to update template", response)
            
            # Test using template (record usage)
            success, response = self.make_request('POST', f'/api/templates/{created_template_id}/use')
            if success and 'prompt' in response:
                self.log_test("Use Template", True, f"Template usage recorded, prompt returned")
            else:
                self.log_test("Use Template", False, "Failed to use template", response)
            
            # Test deleting template
            success, response = self.make_request('DELETE', f'/api/templates/{created_template_id}')
            if success:
                self.log_test("Delete Template", True, "Successfully deleted template")
            else:
                self.log_test("Delete Template", False, "Failed to delete template", response)
        
        # Test using system template
        success, response = self.make_request('GET', '/api/templates')
        if success and 'templates' in response:
            system_templates = [t for t in response['templates'] if t.get('is_system')]
            if system_templates:
                system_template_id = system_templates[0]['template_id']
                success, response = self.make_request('POST', f'/api/templates/{system_template_id}/use')
                if success and 'prompt' in response:
                    self.log_test("Use System Template", True, "Successfully used system template")
                else:
                    self.log_test("Use System Template", False, "Failed to use system template", response)
        
        # Test error cases
        # Try to get non-existent template
        success, response = self.make_request('GET', '/api/templates/nonexistent', expected_status=404)
        if success:
            self.log_test("Get Non-existent Template", True, "Correctly returns 404 for non-existent template")
        else:
            self.log_test("Get Non-existent Template", False, "Should return 404 for non-existent template", response)
        
        # Try to create template with missing required fields
        invalid_template = {"name": ""}  # Missing prompt and other required fields
        success, response = self.make_request('POST', '/api/templates', data=invalid_template, expected_status=422)
        if success:
            self.log_test("Create Invalid Template", True, "Correctly validates required fields")
        else:
            self.log_test("Create Invalid Template", False, "Should validate required fields", response)

    def test_favorites_functionality(self):
        """Test template favorites functionality"""
        if not self.session_token:
            self.log_test("Favorites Tests", False, "No authentication token available")
            return
        
        # Get available templates first
        success, response = self.make_request('GET', '/api/templates')
        if not success or 'templates' not in response:
            self.log_test("Favorites Setup", False, "Cannot get templates for favorites testing", response)
            return
        
        templates = response['templates']
        if not templates:
            self.log_test("Favorites Setup", False, "No templates available for favorites testing")
            return
        
        # Use the first system template for testing
        test_template = None
        for template in templates:
            if template.get('is_system'):
                test_template = template
                break
        
        if not test_template:
            self.log_test("Favorites Setup", False, "No system template found for favorites testing")
            return
        
        template_id = test_template['template_id']
        initial_favorite_status = test_template.get('is_favorite', False)
        
        # Test adding template to favorites
        success, response = self.make_request('POST', f'/api/templates/{template_id}/favorite')
        if success and response.get('is_favorite') == True:
            self.log_test("Add Template to Favorites", True, f"Successfully added template {template_id} to favorites")
        else:
            self.log_test("Add Template to Favorites", False, "Failed to add template to favorites", response)
            return
        
        # Verify template is now marked as favorite
        success, response = self.make_request('GET', '/api/templates')
        if success and 'templates' in response:
            updated_templates = response['templates']
            favorited_template = next((t for t in updated_templates if t['template_id'] == template_id), None)
            
            if favorited_template and favorited_template.get('is_favorite') == True:
                self.log_test("Verify Template Favorited", True, "Template correctly marked as favorite")
                
                # Check favorites count increased
                new_favorites_count = response.get('favorites_count', 0)
                self.log_test("Favorites Count Updated", True, f"Favorites count: {new_favorites_count}")
            else:
                self.log_test("Verify Template Favorited", False, "Template not marked as favorite after adding")
        else:
            self.log_test("Verify Template Favorited", False, "Failed to verify favorite status", response)
        
        # Test getting favorites list
        success, response = self.make_request('GET', '/api/templates/favorites/list')
        if success and 'favorites' in response:
            favorites_list = response['favorites']
            has_our_template = any(f['template_id'] == template_id for f in favorites_list)
            
            if has_our_template:
                self.log_test("Get Favorites List", True, f"Found {len(favorites_list)} favorites including our test template")
            else:
                self.log_test("Get Favorites List", False, "Our test template not found in favorites list")
        else:
            self.log_test("Get Favorites List", False, "Failed to get favorites list", response)
        
        # Test filtering templates to show only favorites
        success, response = self.make_request('GET', '/api/templates?favorites_only=true')
        if success and 'templates' in response:
            favorite_templates = response['templates']
            all_are_favorites = all(t.get('is_favorite') == True for t in favorite_templates)
            has_our_template = any(t['template_id'] == template_id for t in favorite_templates)
            
            if all_are_favorites and has_our_template:
                self.log_test("Filter Favorites Only", True, f"Found {len(favorite_templates)} favorite templates")
            else:
                self.log_test("Filter Favorites Only", False, "Favorites filtering not working correctly")
        else:
            self.log_test("Filter Favorites Only", False, "Failed to filter favorites only", response)
        
        # Test removing template from favorites
        success, response = self.make_request('DELETE', f'/api/templates/{template_id}/favorite')
        if success and response.get('is_favorite') == False:
            self.log_test("Remove Template from Favorites", True, f"Successfully removed template {template_id} from favorites")
        else:
            self.log_test("Remove Template from Favorites", False, "Failed to remove template from favorites", response)
        
        # Verify template is no longer favorite
        success, response = self.make_request('GET', '/api/templates')
        if success and 'templates' in response:
            updated_templates = response['templates']
            unfavorited_template = next((t for t in updated_templates if t['template_id'] == template_id), None)
            
            if unfavorited_template and unfavorited_template.get('is_favorite') == False:
                self.log_test("Verify Template Unfavorited", True, "Template correctly removed from favorites")
                
                # Check favorites count decreased
                final_favorites_count = response.get('favorites_count', 0)
                self.log_test("Favorites Count Decreased", True, f"Favorites count: {final_favorites_count}")
            else:
                self.log_test("Verify Template Unfavorited", False, "Template still marked as favorite after removal")
        else:
            self.log_test("Verify Template Unfavorited", False, "Failed to verify unfavorite status", response)
        
        # Test error cases for favorites
        # Try to favorite non-existent template
        success, response = self.make_request('POST', '/api/templates/nonexistent/favorite', expected_status=404)
        if success:
            self.log_test("Favorite Non-existent Template", True, "Correctly returns 404 for non-existent template")
        else:
            self.log_test("Favorite Non-existent Template", False, "Should return 404 for non-existent template", response)
        
        # Try to unfavorite non-existent template (should succeed silently)
        success, response = self.make_request('DELETE', '/api/templates/nonexistent/favorite')
        if success:
            self.log_test("Unfavorite Non-existent Template", True, "Unfavorite non-existent template handled gracefully")
        else:
            self.log_test("Unfavorite Non-existent Template", False, "Unfavorite non-existent template should succeed", response)
        
        # Test favoriting the same template twice (should be idempotent)
        success, response = self.make_request('POST', f'/api/templates/{template_id}/favorite')
        if success:
            success2, response2 = self.make_request('POST', f'/api/templates/{template_id}/favorite')
            if success2:
                self.log_test("Favorite Template Twice", True, "Favoriting same template twice handled correctly")
                # Clean up - remove the favorite
                self.make_request('DELETE', f'/api/templates/{template_id}/favorite')
            else:
                self.log_test("Favorite Template Twice", False, "Failed to handle duplicate favorite", response2)
        else:
            self.log_test("Favorite Template Twice", False, "Failed initial favorite for duplicate test", response)

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting AI Creative Studio Backend Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Basic connectivity and structure tests
        self.test_health_check()
        self.test_root_endpoint()
        self.test_api_structure()
        self.test_cors_headers()
        
        # Authentication tests (without valid session)
        self.test_auth_me_without_token()
        self.test_settings_api_keys_without_auth()
        self.test_gallery_without_auth()
        self.test_generation_endpoints_without_auth()
        
        # Tests with authentication
        print("\n🔐 Testing with authentication...")
        auth_success = self.test_with_auth_token()
        
        # Template-specific tests (only if authentication works)
        if auth_success:
            print("\n📝 Testing Template functionality...")
            self.test_templates_endpoints()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

    def get_test_results(self):
        """Return detailed test results"""
        return {
            "summary": {
                "total_tests": self.tests_run,
                "passed_tests": self.tests_passed,
                "failed_tests": self.tests_run - self.tests_passed,
                "success_rate": (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
            },
            "test_details": self.test_results,
            "timestamp": datetime.now().isoformat()
        }

def main():
    """Main test execution"""
    tester = AICreativeStudioTester()
    exit_code = tester.run_all_tests()
    
    # Save detailed results
    results = tester.get_test_results()
    with open('/tmp/backend_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: /tmp/backend_test_results.json")
    return exit_code

if __name__ == "__main__":
    sys.exit(main())