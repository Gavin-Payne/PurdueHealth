import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// Define the signin function
const signin = async (username, password) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    throw new Error('Failed to sign in');
  }

  return response.json();
};

const SignIn = ({ setToken, onSuccess, onError }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUsernameInput, setShowUsernameInput] = useState(false);
  const [googleCredential, setGoogleCredential] = useState(null);
  const [newUsername, setNewUsername] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Both username and password are required!');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await signin(username, password);
      setToken(response.token);
      localStorage.setItem('token', response.token);
      onSuccess(response);
    } catch (err) {
      if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Incorrect Username or Password');
      }
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log('Google Sign In success', decoded);
      
      // First, check if this Google account already exists
      const checkRes = await fetch('http://localhost:5000/api/google/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: decoded.email
        })
      });
      
      const checkData = await checkRes.json();
      
      if (checkData.exists) {
        // User exists, proceed with normal sign in
        const res = await fetch('http://localhost:5000/api/google/signin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            credential: credentialResponse.credential,
          })
        });
        
        const data = await res.json();
        if (data.token) {
          setToken(data.token);
          localStorage.setItem('token', data.token);
          onSuccess(data);
        } else {
          throw new Error('No token received');
        }
      } else {
        // New user, show username input
        setGoogleCredential(credentialResponse.credential);
        setShowUsernameInput(true);
      }
    } catch (err) {
      console.error('Google Sign In error:', err);
      setError('Failed to authenticate with Google');
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) {
      setError('Username is required');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('http://localhost:5000/api/google/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          credential: googleCredential,
          username: newUsername
        })
      });
      
      const data = await res.json();
      if (data.error === 'username_taken') {
        setError('Username is already taken');
        return;
      }
      
      if (data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        onSuccess(data);
      } else {
        throw new Error('No token received');
      }
    } catch (err) {
      console.error('Username submission error:', err);
      setError('Failed to create account');
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  if (showUsernameInput) {
    return (
      <div style={containerStyle}>
        <form onSubmit={handleUsernameSubmit} style={formStyle}>
          <h2 style={headerStyle}>Choose Your Username</h2>
          {error && <p style={errorStyle}>{error}</p>}
          <input
            type="text"
            placeholder="Enter username"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <form onSubmit={handleSubmit} style={formStyle}>
        <h2 style={headerStyle}>Sign In</h2>
        {error && <p style={errorStyle}>{error}</p>}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button type="submit" style={buttonStyle} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
        
        {/* New Google Sign-In Button */}
        <div style={{ marginTop: '15px', textAlign: 'center' }}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              console.error('Login Failed');
              setError('Google Sign In failed. Please try again.');
              onError(new Error('Google Sign In failed'));
            }}
            useOneTap
          />
        </div>
      </form>
    </div>
  );
};

// Updated Styles
const containerStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: '#000000', // Purdue Black
  height: '50vh'
};

const formStyle = {
  backgroundColor: '#CEB888', // Purdue Gold
  padding: '20px',
  borderRadius: '8px',
  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
  width: '100%',
  maxWidth: '400px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const headerStyle = {
  textAlign: 'center',
  color: '#000000', // Black text on gold background
  marginBottom: '10px',
  fontWeight: 'bold',
};

const inputStyle = {
  padding: '10px',
  border: '2px solid #000000',
  borderRadius: '5px',
  fontSize: '1em',
  backgroundColor: '#FFFFFF',
  color: '#000000',
};

const buttonStyle = {
  padding: '10px',
  backgroundColor: '#000000', // Black button
  color: '#CEB888', // Gold text
  border: 'none',
  borderRadius: '5px',
  fontSize: '1em',
  cursor: 'pointer',
  fontWeight: 'bold',
  transition: 'background-color 0.3s ease',
  ':hover': {
    backgroundColor: '#333333',
  }
};

const errorStyle = {
  color: '#000000', // Black text for errors
  textAlign: 'center',
  marginBottom: '10px',
  fontSize: '0.9em',
  fontWeight: 'bold',
};

export default SignIn;