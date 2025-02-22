import React, { useState, useEffect } from 'react';
import { useAuth0, Auth0Provider } from '@auth0/auth0-react';
import SignIn from './SignIn'; // Import the SignIn component
import Survey from './Survey'; // Import the Survey component
import Profile from './Profile'; // Import the Profile component
import Settings from './Settings'; // Import the Settings component

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [token, setToken] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [needsSurvey, setNeedsSurvey] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const { isAuthenticated, loginWithRedirect, logout, user, getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      const fetchToken = async () => {
        try {
          const token = await getAccessTokenSilently();
          setToken(token);
          setUserInfo(user);
          setIsLoggedIn(true);

          console.log('Sending user data to backend:', { auth0Id: user.sub, name: user.name, email: user.email });

          // Send user data to backend
          const response = await fetch('http://localhost:5000/api/user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ auth0Id: user.sub, name: user.name, email: user.email })
          });

          const data = await response.json();
          console.log('Response from backend:', data);
        } catch (error) {
          console.error('Error sending user data to backend:', error);
        }
      };
      fetchToken();
    }
  }, [isAuthenticated, getAccessTokenSilently, user]);

  useEffect(() => {
    if (token && userInfo?.sub) {
      checkSurveyStatus(userInfo.sub);
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
    logout({ returnTo: window.location.origin });
    setIsLoggedIn(false);
    setUserInfo(null);
    setToken(null);
    setMenuOpen(false);
    localStorage.removeItem('token');
    console.log('User logged out');
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
    localStorage.setItem('darkMode', !isDarkMode);
  };

  // Placeholder for checkSurveyStatus function
  const checkSurveyStatus = (userId) => {
    // Implement the function to check survey status
    console.log(`Checking survey status for user: ${userId}`);
  };

  const handleSignInSuccess = (token) => {
    setToken(token);
    console.log('Sign-in successful, token set:', token);
  };

  const handleSignInError = (error) => {
    console.error('Sign-in error:', error);
  };

  return (
    <Auth0Provider
      domain={process.env.REACT_APP_AUTH0_DOMAIN}
      clientId={process.env.REACT_APP_AUTH0_CLIENT_ID}
      redirectUri={window.location.origin}
    >
      <div className="app-container">
        {!isLoggedIn ? (
          <div className="login-container">
            <h2>Welcome! Please sign in</h2>
            <SignIn
              setToken={setToken}
              onSuccess={handleSignInSuccess}
              onError={handleSignInError}
            />
          </div>
        ) : needsSurvey ? (
          <Survey
            userId={userInfo?.sub}
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
                <Profile userId={userInfo.sub} token={token} />
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
    </Auth0Provider>
  );
}

export default App;