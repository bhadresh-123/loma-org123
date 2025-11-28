#!/usr/bin/env node

/**
 * LOMA Platform - User Flow Integration Tests
 * 
 * This script tests the most common user flows by making actual HTTP requests
 * to verify that APIs are working correctly.
 */

import fetch from 'node-fetch';

// Configuration
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';
const TEST_USER = {
  username: 'test-therapist@example.com',
  password: 'TestPassword123!',
  name: 'Dr. Test Therapist',
  title: 'Licensed Clinical Psychologist',
  license: 'LCP-12345'
};

// Test state
let authCookie = '';
let userId = null;
let clientId = null;
let sessionId = null;
let taskId = null;

// Helper function to make authenticated requests
async function authenticatedRequest(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Cookie': authCookie,
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

// Helper function to make unauthenticated requests
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

// Test functions
async function testRegistration() {
  console.log('🧪 Testing User Registration...');
  
  try {
    const response = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(TEST_USER)
    });
    
    console.log('✅ Registration successful');
    userId = response.user?.id;
    return true;
  } catch (error) {
    console.log('❌ Registration failed:', error.message);
    return false;
  }
}

async function testLogin() {
  console.log('🧪 Testing User Login...');
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER.username,
        password: TEST_USER.password
      })
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    // Extract cookie
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      authCookie = cookies;
    }
    
    const data = await response.json();
    console.log('✅ Login successful');
    userId = data.user?.id;
    return true;
  } catch (error) {
    console.log('❌ Login failed:', error.message);
    return false;
  }
}

async function testGetCurrentUser() {
  console.log('🧪 Testing Get Current User...');
  
  try {
    const user = await authenticatedRequest('/api/user');
    console.log('✅ Get current user successful');
    console.log(`   User: ${user.username} (ID: ${user.id})`);
    return true;
  } catch (error) {
    console.log('❌ Get current user failed:', error.message);
    return false;
  }
}

async function testCreateClient() {
  console.log('🧪 Testing Create Client...');
  
  try {
    const clientData = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      phone: '555-123-4567',
      billingType: 'private_pay',
      sessionCost: '150.00',
      race: 'White',
      age: 35,
      hometown: 'Anytown, USA',
      pronouns: 'he/him'
    };
    
    const client = await authenticatedRequest('/api/clients', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
    
    console.log('✅ Create client successful');
    console.log(`   Client: ${client.name} (ID: ${client.id})`);
    clientId = client.id;
    return true;
  } catch (error) {
    console.log('❌ Create client failed:', error.message);
    return false;
  }
}

async function testListClients() {
  console.log('🧪 Testing List Clients...');
  
  try {
    const clients = await authenticatedRequest('/api/clients');
    console.log('✅ List clients successful');
    console.log(`   Found ${clients.length} clients`);
    return true;
  } catch (error) {
    console.log('❌ List clients failed:', error.message);
    return false;
  }
}

async function testGetClientDetails() {
  console.log('🧪 Testing Get Client Details...');
  
  try {
    const client = await authenticatedRequest(`/api/clients/${clientId}`);
    console.log('✅ Get client details successful');
    console.log(`   Client: ${client.name} - ${client.email}`);
    return true;
  } catch (error) {
    console.log('❌ Get client details failed:', error.message);
    return false;
  }
}

async function testUpdateClient() {
  console.log('🧪 Testing Update Client...');
  
  try {
    const updateData = {
      name: 'John Smith',
      email: 'john.smith@example.com',
      phone: '555-987-6543'
    };
    
    const client = await authenticatedRequest(`/api/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    
    console.log('✅ Update client successful');
    console.log(`   Updated client: ${client.name}`);
    return true;
  } catch (error) {
    console.log('❌ Update client failed:', error.message);
    return false;
  }
}

async function testCreateSession() {
  console.log('🧪 Testing Create Session...');
  
  try {
    const sessionData = {
      patientId: clientId,
      sessionDate: '2025-01-20',
      sessionNotes: 'Initial assessment completed. Client presents with anxiety symptoms.',
      sessionType: 'individual',
      duration: 50
    };
    
    const session = await authenticatedRequest('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData)
    });
    
    console.log('✅ Create session successful');
    console.log(`   Session ID: ${session.id} for patient ${session.patientId}`);
    sessionId = session.id;
    return true;
  } catch (error) {
    console.log('❌ Create session failed:', error.message);
    return false;
  }
}

async function testListSessions() {
  console.log('🧪 Testing List Sessions...');
  
  try {
    const sessions = await authenticatedRequest('/api/sessions');
    console.log('✅ List sessions successful');
    console.log(`   Found ${sessions.length} sessions`);
    return true;
  } catch (error) {
    console.log('❌ List sessions failed:', error.message);
    return false;
  }
}

async function testUpdateSessionStatus() {
  console.log('🧪 Testing Update Session Status...');
  
  try {
    const session = await authenticatedRequest(`/api/sessions/${sessionId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' })
    });
    
    console.log('✅ Update session status successful');
    console.log(`   Session ${sessionId} status: ${session.status}`);
    return true;
  } catch (error) {
    console.log('❌ Update session status failed:', error.message);
    return false;
  }
}

async function testCreateTask() {
  console.log('🧪 Testing Create Task...');
  
  try {
    const taskData = {
      title: 'Follow up on homework assignment',
      description: 'Check if client completed anxiety journal',
      dueDate: '2025-01-25',
      priority: 'medium',
      patientId: clientId
    };
    
    const task = await authenticatedRequest('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(taskData)
    });
    
    console.log('✅ Create task successful');
    console.log(`   Task: ${task.title} (ID: ${task.id})`);
    taskId = task.id;
    return true;
  } catch (error) {
    console.log('❌ Create task failed:', error.message);
    return false;
  }
}

async function testListTasks() {
  console.log('🧪 Testing List Tasks...');
  
  try {
    const tasks = await authenticatedRequest('/api/tasks');
    console.log('✅ List tasks successful');
    console.log(`   Found ${tasks.length} tasks`);
    return true;
  } catch (error) {
    console.log('❌ List tasks failed:', error.message);
    return false;
  }
}

async function testCompleteTask() {
  console.log('🧪 Testing Complete Task...');
  
  try {
    const task = await authenticatedRequest(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'completed' })
    });
    
    console.log('✅ Complete task successful');
    console.log(`   Task ${taskId} status: ${task.status}`);
    return true;
  } catch (error) {
    console.log('❌ Complete task failed:', error.message);
    return false;
  }
}

async function testGetUserProfile() {
  console.log('🧪 Testing Get User Profile...');
  
  try {
    const profile = await authenticatedRequest('/api/user/profile');
    console.log('✅ Get user profile successful');
    console.log(`   Profile: ${profile.name} - ${profile.email}`);
    return true;
  } catch (error) {
    console.log('❌ Get user profile failed:', error.message);
    return false;
  }
}

async function testUpdateUserProfile() {
  console.log('🧪 Testing Update User Profile...');
  
  try {
    const updateData = {
      name: 'Dr. Updated Therapist',
      practiceDetails: {
        biography: 'Updated biography',
        yearsOfExperience: 15,
        specialties: ['Anxiety', 'Depression', 'Trauma']
      }
    };
    
    const result = await authenticatedRequest('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
    
    console.log('✅ Update user profile successful');
    return true;
  } catch (error) {
    console.log('❌ Update user profile failed:', error.message);
    return false;
  }
}

async function testLogout() {
  console.log('🧪 Testing User Logout...');
  
  try {
    const result = await authenticatedRequest('/api/logout', {
      method: 'POST'
    });
    
    console.log('✅ Logout successful');
    return true;
  } catch (error) {
    console.log('❌ Logout failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting LOMA Platform User Flow Tests');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('='.repeat(60));
  
  const tests = [
    testRegistration,
    testLogin,
    testGetCurrentUser,
    testCreateClient,
    testListClients,
    testGetClientDetails,
    testUpdateClient,
    testCreateSession,
    testListSessions,
    testUpdateSessionStatus,
    testCreateTask,
    testListTasks,
    testCompleteTask,
    testGetUserProfile,
    testUpdateUserProfile,
    testLogout
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const success = await test();
      if (success) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.log('❌ Test error:', error.message);
      failed++;
    }
    console.log(''); // Empty line for readability
  }
  
  console.log('='.repeat(60));
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! The LOMA platform is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please check the API endpoints and database.');
  }
  
  return failed === 0;
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
});
