import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import './Auth0SignIn.css';

const Auth0SignIn = () => {
  const { loginWithRedirect, logout, user, isAuthenticated, isLoading, error } = useAuth0();
  const [loginError, setLoginError] = useState(null);

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
          <button 
            onClick={handleLogout}
            className="auth0-button logout"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
};

export default Auth0SignIn;