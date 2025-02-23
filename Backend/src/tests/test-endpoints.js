const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5000/api/dietary';
let token = null;

async function runTests() {
  try {
    // Test basic connection
    console.log('\nTesting basic connection...');
    const basicResponse = await axios.get(`${BASE_URL}/test-connection`);
    console.log('Basic connection successful:', basicResponse.data);

    // Get token from environment or prompt
    token = process.env.TEST_TOKEN;
    if (!token) {
      console.error('No test token found in environment');
      process.exit(1);
    }

    // Test authenticated endpoint
    console.log('\nTesting authenticated endpoint...');
    const authResponse = await axios.get(`${BASE_URL}/collections-stats`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    console.log('Authentication successful:', authResponse.data);

  } catch (error) {
    console.error('Test failed:', {
      message: error.message,
      response: error.response?.data
    });
  }
}

runTests();