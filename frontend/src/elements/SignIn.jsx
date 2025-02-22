import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

const SignIn = ({ setToken, onSuccess, onError }) => {
  const { loginWithRedirect, isAuthenticated, user, getIdTokenClaims } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth0Login = async () => {
    try {
      setLoading(true);
      await loginWithRedirect();
    } catch (err) {
      console.error('Auth0 login error:', err);
      setError('Failed to authenticate with Auth0');
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    try {
      const claims = await getIdTokenClaims();
      const token = claims.__raw;
      setToken(token);
      localStorage.setItem('token', token);
  
      const response = await fetch('http://localhost:5000/api/user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
  
      const data = await response.json();
      if (response.ok) {
        onSuccess(data);
      } else {
        throw new Error(data.message || 'Failed to sign in');
      }
    } catch (err) {
      console.error('Continue error:', err);
      setError('Failed to continue');
      onError(err);
    }
  };

  if (isAuthenticated) {
    return (
      <div style={containerStyle}>
        <p>Welcome, {user.name}</p>
        <button onClick={handleContinue}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={formStyle}>
        <h2 style={headerStyle}>Sign In</h2>
        {error && <p style={errorStyle}>{error}</p>}
        <button onClick={handleAuth0Login} style={buttonStyle} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign In with Auth0'}
        </button>
      </div>
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
};

const errorStyle = {
  color: '#000000', // Black text for errors
  textAlign: 'center',
  marginBottom: '10px',
  fontSize: '0.9em',
  fontWeight: 'bold',
};

export default SignIn;