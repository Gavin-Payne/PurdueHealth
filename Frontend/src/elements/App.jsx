import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import Auth0SignIn from './Auth0SignIn';
import Survey from './Survey';
import './App.css';
import Profile from './Profile';
import Settings from './Settings';
import WorkoutPlan from './WorkoutPlan';
import { auth0Config } from '../auth0-config';
import ErrorBoundary from './ErrorBoundary';

const App = () => {
  const { isAuthenticated, user, getAccessTokenSilently, logout } = useAuth0();
  const [menuOpen, setMenuOpen] = useState(false);
  const [needsSurvey, setNeedsSurvey] = useState(true);
  const [activeView, setActiveView] = useState('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      if (isAuthenticated && user?.email) {
        try {
          const accessToken = await getAccessTokenSilently({
            authorizationParams: {
              audience: auth0Config.audience,
              scope: auth0Config.scope
            }
          });

          // Add email to authorization header
          const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'X-User-Email': user.email
          };

          setToken(accessToken);
          console.log('Auth initialized:', { 
            email: user.email, 
            tokenPresent: !!accessToken,
            headers
          });
          
          await checkSurveyStatus(user.email, accessToken);
        } catch (error) {
          console.error('Auth initialization error:', error);
        }
      }
    };

    initializeAuth();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode');
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'true');
    }
  }, []);

  const checkSurveyStatus = async (userId, currentToken) => {
    try {
      if (!currentToken || !userId) {
        console.error('Missing token or userId for survey status check:', { 
          hasToken: !!currentToken, 
          userId 
        });
        return;
      }

      console.log('Checking survey status with:', { userId, tokenPresent: !!currentToken });
      
      const response = await fetch(`http://localhost:5000/api/survey/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Survey status response:', data);

      if (!response.ok) {
        throw new Error(`Survey status check failed: ${response.statusText}`);
      }

      setNeedsSurvey(!data.hasTakenSurvey);
    } catch (error) {
      console.error('Error checking survey status:', error);
      // Don't set needsSurvey here - keep previous state
    }
  };

  const handleSurveyComplete = async () => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setNeedsSurvey(false);
      if (user?.email) {
        try {
          const surveyResponse = await fetch(`http://localhost:5000/api/survey/status/${user.email}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const surveyData = await surveyResponse.json();
          
          if (!surveyData.hasTakenSurvey) {
            throw new Error('Survey data not yet saved');
          }

          await generateWorkoutPlan(user.email);
        } catch (error) {
          console.error('Error verifying survey data:', error);
          setNeedsSurvey(true);
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in handleSurveyComplete:', error);
      alert('There was an error saving your survey. Please try again.');
    }
  };

  const generateWorkoutPlan = async (userId) => {
    try {
        const surveyCheckResponse = await fetch(`http://localhost:5000/api/survey/status/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const surveyStatus = await surveyCheckResponse.json();
        if (!surveyStatus.hasTakenSurvey) {
            throw new Error('Please complete the survey first');
        }

        const response = await fetch(`http://localhost:5000/api/workout-plan/${userId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const text = await response.text();
        console.log('Raw response:', text);

        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            console.error('Error parsing response:', e);
            throw new Error('Invalid response from server');
        }

        if (!response.ok) {
            throw new Error(data.error || 'Failed to generate workout plan');
        }

        setWorkoutPlan(data);
        return data;
    } catch (error) {
        console.error('Error generating workout plan:', error);
        throw error;
    }
};

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const closeMenu = () => {
    setMenuOpen(false);
  };

  const handleLogout = () => {
    logout({ 
      logoutParams: {
        returnTo: window.location.origin
      }
    });
    // Clear local state
    setToken(null);
    setNeedsSurvey(true);
    setWorkoutPlan(null);
    setActiveView('home');
    closeMenu();
  };

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
    localStorage.setItem('darkMode', !isDarkMode);
  };

  if (!isAuthenticated) {
    return <Auth0SignIn />;
  }

  return (
    <div className="App">
      {needsSurvey && user?.email ? (
        <Survey 
          userId={user.email}
          token={token}
          onComplete={handleSurveyComplete}
        />
      ) : (
        <ErrorBoundary>
          <div className="App">
            {!isAuthenticated ? (
              <Auth0SignIn />
            ) : needsSurvey ? (
              <Survey 
                userId={user?.email}
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
                      <li onClick={() => { setActiveView('workoutPlan'); closeMenu(); }}>Workout Plan</li>
                      <li onClick={() => { setActiveView('settings'); closeMenu(); }}>Settings</li>
                      <li onClick={handleLogout}>Log Out</li>
                    </ul>
                  </nav>
                )}
                <main className="main-content">
                  {activeView === 'profile' ? (
                    <Profile userId={user.email} token={token} />
                  ) : activeView === 'settings' ? (
                    <Settings isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
                  ) : activeView === 'workoutPlan' ? (
                    <WorkoutPlan 
                      userId={user.email} 
                      token={token} 
                      workoutPlan={workoutPlan}
                      onRegenerateClick={() => generateWorkoutPlan(user.email)}
                    />
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
        </ErrorBoundary>
      )}
    </div>
  );
}

export default App;

