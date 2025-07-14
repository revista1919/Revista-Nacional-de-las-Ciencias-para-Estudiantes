#!/usr/bin/env python3
"""
Comprehensive Backend Testing for La Revista Nacional de las Ciencias para Estudiantes
Tests all high-priority backend integrations with real services.
"""

import requests
import json
import os
import time
from io import BytesIO
import tempfile
from pathlib import Path

# Get backend URL from frontend .env
def get_backend_url():
    frontend_env_path = Path("/app/frontend/.env")
    if frontend_env_path.exists():
        with open(frontend_env_path, 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    return "http://localhost:8001"

BASE_URL = get_backend_url()
API_URL = f"{BASE_URL}/api"

print(f"Testing backend at: {API_URL}")

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.super_admin_token = None
        self.test_results = {}
        
    def log_test(self, test_name, success, message="", details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results[test_name] = {
            "success": success,
            "message": message,
            "details": details
        }
        
    def create_test_docx_file(self):
        """Create a test .docx file for paper submission"""
        # Create a simple text file that mimics a .docx for testing
        content = b"Test paper content for La Revista Nacional de las Ciencias para Estudiantes. " * 100
        return content, "test_paper.docx"
        
    def create_test_pdf_file(self):
        """Create a test PDF file for CV/certificates"""
        # Simple PDF-like content for testing
        content = b"%PDF-1.4 Test CV content for admin application. " * 50
        return content, "test_cv.pdf"

    def test_api_health(self):
        """Test basic API connectivity"""
        try:
            response = self.session.get(f"{API_URL}/")
            if response.status_code == 200:
                data = response.json()
                if "La Revista Nacional" in data.get("message", ""):
                    self.log_test("API Health Check", True, "API is responding correctly")
                    return True
                else:
                    self.log_test("API Health Check", False, f"Unexpected response: {data}")
                    return False
            else:
                self.log_test("API Health Check", False, f"HTTP {response.status_code}: {response.text}")
                return False
        except Exception as e:
            self.log_test("API Health Check", False, f"Connection error: {str(e)}")
            return False

    def test_super_admin_registration(self):
        """Test super admin registration with specific credentials"""
        try:
            # Test data for super admin
            data = {
                "email": "revistaestudiantespentauc@gmail.com",
                "password": "RevistaDeEstudiantes@1928",
                "name": "Super Admin",
                "institution": "Universidad Central",
                "study_area": "Administración de Revista"
            }
            
            response = self.session.post(f"{API_URL}/register", data=data)
            
            if response.status_code == 200:
                self.log_test("Super Admin Registration", True, "Super admin registered successfully")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                self.log_test("Super Admin Registration", True, "Super admin already exists (expected)")
                return True
            else:
                self.log_test("Super Admin Registration", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Super Admin Registration", False, f"Error: {str(e)}")
            return False

    def test_jwt_authentication(self):
        """Test JWT authentication system"""
        try:
            # Test login with super admin credentials
            login_data = {
                "username": "revistaestudiantespentauc@gmail.com",
                "password": "RevistaDeEstudiantes@1928"
            }
            
            response = self.session.post(f"{API_URL}/token", data=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "bearer" in data.get("token_type", ""):
                    self.auth_token = data["access_token"]
                    self.super_admin_token = data["access_token"]
                    
                    # Test protected endpoint
                    headers = {"Authorization": f"Bearer {self.auth_token}"}
                    user_response = self.session.get(f"{API_URL}/current_user", headers=headers)
                    
                    if user_response.status_code == 200:
                        user_data = user_response.json()
                        if user_data.get("role") == "super_admin":
                            self.log_test("JWT Authentication", True, "Authentication working, super admin role confirmed")
                            return True
                        else:
                            self.log_test("JWT Authentication", False, f"Role mismatch: {user_data.get('role')}")
                            return False
                    else:
                        self.log_test("JWT Authentication", False, f"Protected endpoint failed: {user_response.status_code}")
                        return False
                else:
                    self.log_test("JWT Authentication", False, f"Invalid token response: {data}")
                    return False
            else:
                self.log_test("JWT Authentication", False, f"Login failed: HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("JWT Authentication", False, f"Error: {str(e)}")
            return False

    def test_paper_submission(self):
        """Test paper submission with file upload"""
        try:
            # Create test file
            file_content, filename = self.create_test_docx_file()
            
            # Paper submission data
            data = {
                "title": "Análisis de Algoritmos Cuánticos en Computación Moderna",
                "authors": "María González, Juan Pérez",
                "institution": "Universidad Nacional de Colombia",
                "email": "test.student@universidad.edu.co",
                "category": "Informática",
                "abstract": "Este estudio presenta un análisis exhaustivo de los algoritmos cuánticos y su aplicación en la computación moderna. Se exploran las ventajas y limitaciones de estos algoritmos en comparación con los métodos clásicos.",
                "keywords": "algoritmos cuánticos, computación, análisis",
                "word_count": 3500
            }
            
            files = {"file": (filename, file_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
            
            response = self.session.post(f"{API_URL}/submit-paper", data=data, files=files)
            
            if response.status_code == 200:
                result = response.json()
                if "doi" in result and "RNCE-" in result["doi"]:
                    self.log_test("Paper Submission API", True, f"Paper submitted successfully with DOI: {result['doi']}")
                    return True
                else:
                    self.log_test("Paper Submission API", False, f"Missing DOI in response: {result}")
                    return False
            else:
                self.log_test("Paper Submission API", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Paper Submission API", False, f"Error: {str(e)}")
            return False

    def test_admin_application(self):
        """Test admin application with file uploads"""
        try:
            # Create test files
            cv_content, cv_filename = self.create_test_pdf_file()
            cert_content, cert_filename = self.create_test_pdf_file()
            
            # Admin application data
            data = {
                "name": "Dr. Ana Rodríguez",
                "email": "ana.rodriguez@universidad.edu.co",
                "institution": "Universidad de los Andes",
                "motivation_letter": "Como investigadora con más de 10 años de experiencia en el campo de las ciencias naturales, estoy profundamente comprometida con el avance del conocimiento científico y la formación de nuevas generaciones de investigadores. Mi experiencia incluye la publicación de más de 50 artículos en revistas indexadas y la dirección de múltiples proyectos de investigación. Considero que mi participación como revisora en La Revista Nacional de las Ciencias para Estudiantes sería una oportunidad invaluable para contribuir al desarrollo académico de los estudiantes y mantener los más altos estándares de calidad científica en las publicaciones estudiantiles.",
                "specialization": "Biología Molecular, Genética, Biotecnología",
                "references": "Dr. Carlos Mendoza - Universidad Nacional, Dra. Laura Vásquez - UNAM",
                "experience": "10 años de investigación, 50+ publicaciones, 5 proyectos dirigidos"
            }
            
            files = {
                "cv": (cv_filename, cv_content, "application/pdf"),
                "certificates": (cert_filename, cert_content, "application/pdf")
            }
            
            response = self.session.post(f"{API_URL}/apply-admin", data=data, files=files)
            
            if response.status_code == 200:
                result = response.json()
                if "successfully" in result.get("message", ""):
                    self.log_test("Admin Application API", True, "Admin application submitted successfully")
                    return True
                else:
                    self.log_test("Admin Application API", False, f"Unexpected response: {result}")
                    return False
            else:
                self.log_test("Admin Application API", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Application API", False, f"Error: {str(e)}")
            return False

    def test_papers_retrieval(self):
        """Test papers retrieval endpoint"""
        try:
            response = self.session.get(f"{API_URL}/papers")
            
            if response.status_code == 200:
                papers = response.json()
                if isinstance(papers, list):
                    self.log_test("Papers Retrieval", True, f"Retrieved {len(papers)} papers")
                    return True
                else:
                    self.log_test("Papers Retrieval", False, f"Expected list, got: {type(papers)}")
                    return False
            else:
                self.log_test("Papers Retrieval", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Papers Retrieval", False, f"Error: {str(e)}")
            return False

    def test_categories_endpoint(self):
        """Test categories endpoint"""
        try:
            response = self.session.get(f"{API_URL}/categories")
            
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    expected_categories = ['Matemáticas', 'Física', 'Química', 'Biología']
                    if any(cat in categories for cat in expected_categories):
                        self.log_test("Categories Endpoint", True, f"Retrieved {len(categories)} categories")
                        return True
                    else:
                        self.log_test("Categories Endpoint", False, f"Missing expected categories: {categories}")
                        return False
                else:
                    self.log_test("Categories Endpoint", False, f"Expected non-empty list, got: {categories}")
                    return False
            else:
                self.log_test("Categories Endpoint", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Categories Endpoint", False, f"Error: {str(e)}")
            return False

    def test_admin_endpoints(self):
        """Test admin-only endpoints"""
        if not self.super_admin_token:
            self.log_test("Admin Endpoints", False, "No super admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.super_admin_token}"}
            
            # Test admin applications endpoint
            response = self.session.get(f"{API_URL}/admin/applications", headers=headers)
            
            if response.status_code == 200:
                applications = response.json()
                if isinstance(applications, list):
                    self.log_test("Admin Endpoints", True, f"Admin can access applications ({len(applications)} found)")
                    return True
                else:
                    self.log_test("Admin Endpoints", False, f"Expected list, got: {type(applications)}")
                    return False
            else:
                self.log_test("Admin Endpoints", False, f"HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Endpoints", False, f"Error: {str(e)}")
            return False

    def test_paper_review_workflow(self):
        """Test paper review workflow"""
        if not self.super_admin_token:
            self.log_test("Paper Review Workflow", False, "No super admin token available")
            return False
            
        try:
            # First, get papers to find one to review
            response = self.session.get(f"{API_URL}/papers?status=pending")
            
            if response.status_code == 200:
                papers = response.json()
                if len(papers) > 0:
                    paper_id = papers[0]["id"]
                    
                    # Test review endpoint
                    headers = {"Authorization": f"Bearer {self.super_admin_token}"}
                    review_data = {
                        "action": "approved",
                        "comment": "Excelente trabajo de investigación. El análisis es riguroso y las conclusiones están bien fundamentadas."
                    }
                    
                    review_response = self.session.post(
                        f"{API_URL}/review/{paper_id}", 
                        data=review_data, 
                        headers=headers
                    )
                    
                    if review_response.status_code == 200:
                        result = review_response.json()
                        if "successfully" in result.get("message", ""):
                            self.log_test("Paper Review Workflow", True, "Paper review completed successfully")
                            return True
                        else:
                            self.log_test("Paper Review Workflow", False, f"Unexpected response: {result}")
                            return False
                    else:
                        self.log_test("Paper Review Workflow", False, f"Review failed: HTTP {review_response.status_code}: {review_response.text}")
                        return False
                else:
                    self.log_test("Paper Review Workflow", True, "No pending papers to review (expected if no submissions)")
                    return True
            else:
                self.log_test("Paper Review Workflow", False, f"Failed to get papers: HTTP {response.status_code}: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Paper Review Workflow", False, f"Error: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("=" * 80)
        print("BACKEND TESTING FOR LA REVISTA NACIONAL DE LAS CIENCIAS PARA ESTUDIANTES")
        print("=" * 80)
        
        tests = [
            ("API Health Check", self.test_api_health),
            ("Super Admin Registration", self.test_super_admin_registration),
            ("JWT Authentication System", self.test_jwt_authentication),
            ("Paper Submission API", self.test_paper_submission),
            ("Admin Application API", self.test_admin_application),
            ("Papers Retrieval", self.test_papers_retrieval),
            ("Categories Endpoint", self.test_categories_endpoint),
            ("Admin Endpoints", self.test_admin_endpoints),
            ("Paper Review Workflow", self.test_paper_review_workflow),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            print(f"\n--- Testing: {test_name} ---")
            try:
                if test_func():
                    passed += 1
                time.sleep(1)  # Brief pause between tests
            except Exception as e:
                self.log_test(test_name, False, f"Test execution error: {str(e)}")
        
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        # Detailed results
        print("\nDETAILED RESULTS:")
        for test_name, result in self.test_results.items():
            status = "✅" if result["success"] else "❌"
            print(f"{status} {test_name}: {result['message']}")
            if result["details"]:
                print(f"   {result['details']}")
        
        return passed, total

if __name__ == "__main__":
    tester = BackendTester()
    passed, total = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if passed == total else 1)