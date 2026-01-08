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