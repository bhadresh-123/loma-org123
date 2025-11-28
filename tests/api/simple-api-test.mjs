#!/usr/bin/env node

/**
 * LOMA Platform - Simple API Test
 * 
 * Tests the most critical user flows to verify APIs are working
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test data
const testUser = {
  username: 'test-therapist@example.com',
  password: 'TestPassword123!',
  name: 'Dr. Test Therapist',
  title: 'Licensed Clinical Psychologist',
  license: 'LCP-12345'
};

let authCookie = '';

async function testEndpoint(method, endpoint, data = null, description = '') {
  console.log(`🧪 ${description || `${method} ${endpoint}`}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authCookie && { 'Cookie': authCookie })
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const result = await response.json();
    
    if (response.ok) {
      console.log(`✅ Success (${response.status})`);
      return { success: true, data: result };
    } else {
      console.log(`❌ Failed (${response.status}): ${result.error || result.message || 'Unknown error'}`);
      return { success: false, error: result };
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing LOMA Platform APIs');
  console.log('='.repeat(50));
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Registration
  const regResult = await testEndpoint('POST', '/api/register', testUser, 'User Registration');
  if (regResult.success) passed++; else failed++;
  
  // Test 2: Login
  const loginResponse = await fetch(`${BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: testUser.username,
      password: testUser.password
    })
  });
  
  if (loginResponse.ok) {
    console.log('✅ Login Success');
    passed++;
    
    // Extract cookie for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie');
    if (cookies) {
      authCookie = cookies;
    }
  } else {
    console.log('❌ Login Failed');
    failed++;
  }
  
  // Test 3: Get Current User
  const userResult = await testEndpoint('GET', '/api/user', null, 'Get Current User');
  if (userResult.success) passed++; else failed++;
  
  // Test 4: List Clients (legacy alias)
  const clientsResult = await testEndpoint('GET', '/api/clients', null, 'List Clients (Legacy Alias)');
  if (clientsResult.success) passed++; else failed++;
  
  // Test 5: Create Client (legacy alias)
  const clientData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '555-123-4567',
    billingType: 'private_pay',
    sessionCost: '150.00'
  };
  
  const createClientResult = await testEndpoint('POST', '/api/clients', clientData, 'Create Client (Legacy Alias)');
  if (createClientResult.success) passed++; else failed++;
  
  // Test 6: List Sessions (legacy alias)
  const sessionsResult = await testEndpoint('GET', '/api/sessions', null, 'List Sessions (Legacy Alias)');
  if (sessionsResult.success) passed++; else failed++;
  
  // Test 7: List Tasks (should return empty array)
  const tasksResult = await testEndpoint('GET', '/api/tasks', null, 'List Tasks (Empty Array)');
  if (tasksResult.success) passed++; else failed++;
  
  // Test 8: Get User Profile
  const profileResult = await testEndpoint('GET', '/api/user/profile', null, 'Get User Profile');
  if (profileResult.success) passed++; else failed++;
  
  // Test 9: List Organizations
  const orgsResult = await testEndpoint('GET', '/api/organizations', null, 'List Organizations');
  if (orgsResult.success) passed++; else failed++;
  
  // Test 10: List Patients (direct HIPAA endpoint)
  const patientsResult = await testEndpoint('GET', '/api/patients', null, 'List Patients (Direct HIPAA)');
  if (patientsResult.success) passed++; else failed++;
  
  console.log('='.repeat(50));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! APIs are working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.');
  }
  
  return failed === 0;
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
});
