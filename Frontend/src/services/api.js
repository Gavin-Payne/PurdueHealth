import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'https://boilerfit.me'
    : 'http://localhost:3000';

export const signin = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/signin`, { username, password });
      console.log("Signin response data:", response.data);  // Log the response to see token and data
      return response.data;  // Ensure response contains { token: 'some-jwt-token' }
    } catch (error) {
      console.error("Error in signin:", error); // Log errors for debugging
      throw error.response?.data || error.message;
    }
  };