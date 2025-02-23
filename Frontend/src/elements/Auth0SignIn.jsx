import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './Auth0SignIn.css';

const Auth0SignIn = () => {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error, getAccessTokenSilently } = useAuth0();
  const [loginError, setLoginError] = useState(null);
  const [apiData, setApiData] = useState(null); // To store data fetched from the API

  // Handle Login
  const handleLogin = async () => {
    try {
      await loginWithRedirect({
        appState: { returnTo: window.location.pathname },
        prompt: 'login'
      });
    } catch (error) {
      console.error('Login error:', error);
      setLoginError(error.message);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout({
        logoutParams: {
          returnTo: window.location.origin
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
      setLoginError(error.message);
    }
  };

  // Fetch data from API
  const fetchData = async () => {
    try {
      let token;

      // Try to get the token silently
      try {
        token = await getAccessTokenSilently();
      } catch (error) {
        console.log('Silent token fetch failed, trying login...');
        setLoginError('Please log in to fetch data');
        return; // Early return to prevent further API calls
      }

      // Log the token to ensure it was retrieved
      console.log("Access Token:", token);

      if (token) {
        const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/health`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Authentication failed or data fetching error');
        }

        const data = await response.json();
        setApiData(data); // Set the fetched data
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoginError(error.message);
    }
  };

  // Trigger fetchData after successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  if (isLoading) {
    return <div className="auth0-loading">Loading...</div>;
  }

  if (error) {
    return (
        <div className="auth0-error">
          <p>Authentication Error: {error.message}</p>
          <button onClick={() => window.location.reload()} className="auth0-button">
            Try Again
          </button>
        </div>
    );
  }

  return (
      <div className="auth0-container">
        {loginError && <div className="auth0-error">{loginError}</div>}
        {!isAuthenticated ? (
            <button onClick={handleLogin} className="auth0-button login">
              Sign In with Auth0
            </button>
        ) : (
            <div className="auth0-profile">
              <img src={user.picture} alt={user.name} />
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <button onClick={handleLogout} className="auth0-button logout">
                Log Out
              </button>

              {/* Display fetched API data */}
              {apiData && (
                  <div className="api-data">
                    <h3>Fetched Data:</h3>
                    <pre>{JSON.stringify(apiData, null, 2)}</pre>
                  </div>
              )}
            </div>
        )}
      </div>
  );
};

export default Auth0SignIn;
