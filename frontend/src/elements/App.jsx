import React, { useState, useEffect } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import SignIn from './googleSignIn';
import Survey from './Survey';
import './App.css';
import jwtDecode from 'jwt-decode';
import Profile from './Profile';
import Settings from './Settings';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [token, setToken] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [needsSurvey, setNeedsSurvey] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (token && userInfo?.id) {
      checkSurveyStatus(userInfo.id);
    }
  }, [token, userInfo]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'true');
    }
  }, []);

  const handleLoginSuccess = async (response) => {
    console.log('Full login response:', response);

    if (!response || !response.token) {
      console.error('Invalid response from login');
      return;
    }

    try {
      const user = {
        ...response.user,
        id: response.user.email
      };

      // Set token first
      setToken(response.token);
      // Then set other states
      setIsLoggedIn(true);
      setUserInfo(user);

      console.log('Token set to:', response.token);
      console.log('Setting user info:', user);

    } catch (error) {
      console.error('Error in handleLoginSuccess:', error);
      handleLoginFailure(error);
    }
  };

  const handleLoginFailure = (error) => {
    console.log('Login Failed:', error);
  };

  const checkSurveyStatus = async (userId) => {
    try {
      console.log('Checking survey status with:', {
        userId,
        token,
        hasToken: !!token,
        hasUserId: !!userId
      });

      if (!token || !userId) {
        console.error('Missing token or userId for survey status check');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/survey/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Survey status check failed: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Survey status response:', data);

      setNeedsSurvey(!data.hasTakenSurvey);

    } catch (error) {
      console.error('Error checking survey status:', error);
      // Default to showing survey if status check fails
      setNeedsSurvey(true);
    }
  };

  const handleSurveyComplete = () => {
    setNeedsSurvey(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = () => {
    // Clear all states
    setIsLoggedIn(false);
    setUserInfo(null);
    setToken(null);
    setMenuOpen(false);

    // Clear local storage
    localStorage.removeItem('token');

    console.log('User logged out');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
    localStorage.setItem('darkMode', !isDarkMode);
  };

  return (
      <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
        <div className="app-container">
          {!isLoggedIn ? (
              <div className="login-container">
                <h2>Welcome! Please sign in</h2>
                <SignIn
                    setToken={setToken}
                    onSuccess={handleLoginSuccess}
                    onError={handleLoginFailure}
                />
              </div>
          ) : needsSurvey ? (
              <Survey
                  userId={userInfo?.id || userInfo?.sub}  // Try both possible locations
                  token={token}
                  onComplete={handleSurveyComplete}
              />
          ) : (
              <div className="app-main">
                <header className="main-header">
                  <div className="menu-icon" onClick={toggleMenu}>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                  </div>
                  <div className="header-title">BoilerFit</div>
                </header>
                {menuOpen && (
                    <nav className="side-menu">
                      <ul>
                        <li onClick={() => { setActiveView('home'); closeMenu(); }}>Home</li>
                        <li onClick={() => { setActiveView('profile'); closeMenu(); }}>Profile</li>
                        <li onClick={() => { setActiveView('settings'); closeMenu(); }}>Settings</li>
                        <li onClick={handleLogout}>Log Out</li>
                      </ul>
                    </nav>
                )}
                <main className="main-content">
                  {activeView === 'profile' ? (
                      <Profile userId={userInfo.id} token={token} />
                  ) : activeView === 'settings' ? (
                      <Settings isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
                  ) : (
                      <div className="home-content">
                        <h2>Welcome to BoilerFit</h2>
                        <p>Your personalized fitness and nutrition companion.</p>
                      </div>
                  )}
                </main>
              </div>
          )}
        </div>
      </GoogleOAuthProvider>
  );
}

export default App;