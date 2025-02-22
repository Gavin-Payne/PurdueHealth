import React, { useState, useEffect, useCallback } from 'react';
import './Profile.css';

const Profile = ({ userId, token }) => {
  const [surveyData, setSurveyData] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [editedValue, setEditedValue] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Memoize the regenerateWorkoutPlan function
  const regenerateWorkoutPlan = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/workout-plan/${userId}/regenerate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate workout plan');
      }
    } catch (error) {
      console.error('Error regenerating workout plan:', error);
      alert('Failed to update workout plan');
    }
  }, [userId, token]);

  // Memoize the fetchSurveyData function with all dependencies
  const fetchSurveyData = useCallback(async () => {
    if (!token || !userId) {
      console.log('Missing auth data:', { hasToken: !!token, userId });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`http://localhost:5000/api/survey/data/${userId}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Email': userId
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch survey data');
      }

      if (!data.answers) {
        throw new Error('Invalid survey data format');
      }

      setSurveyData(data.answers);
    } catch (error) {
      console.error('Survey fetch error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  // Update useEffect with proper dependencies
  useEffect(() => {
    fetchSurveyData();
  }, [fetchSurveyData, userId, token]);

  const handleEdit = (field) => {
    setIsEditing(field);
    setEditedValue(prevValue => ({
      ...prevValue,
      [field]: surveyData[field]
    }));
  };

  const handleSave = async (field) => {
    try {
      const response = await fetch(`http://localhost:5000/api/survey/${userId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-User-Email': userId
        },
        body: JSON.stringify({
          field,
          value: editedValue[field]
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update field');
      }

      const data = await response.json();
      setSurveyData(prev => ({
        ...prev,
        [field]: data.value
      }));
      setIsEditing(null);

      // If workout-related field changed, regenerate workout plan
      const workoutFields = ['workout', 'liftingFrequency', 'cardioFrequency', 'workoutDuration'];
      if (workoutFields.includes(field)) {
        await regenerateWorkoutPlan();
      }
    } catch (error) {
      console.error('Error updating survey data:', error);
      alert(`Failed to update ${field}: ${error.message}`);
    }
  };

  const renderField = (field, label) => {
    const value = surveyData?.[field];
    const isEditingThis = isEditing === field;

    return (
      <div className="profile-field">
        <label>{label}</label>
        {isEditingThis ? (
          <div className="edit-controls">
            {field === 'height' ? (
              <>
                <input
                  type="number"
                  value={editedValue.feet || ''}
                  onChange={(e) => setEditedValue(prev => ({
                    ...prev,
                    feet: e.target.value
                  }))}
                  placeholder="Feet"
                />
                <input
                  type="number"
                  value={editedValue.inches || ''}
                  onChange={(e) => setEditedValue(prev => ({
                    ...prev,
                    inches: e.target.value
                  }))}
                  placeholder="Inches"
                />
              </>
            ) : (
              <input
                type={field === 'weight' ? 'number' : 'text'}
                value={editedValue[field] || ''}
                onChange={(e) => setEditedValue(prev => ({
                  ...prev,
                  [field]: e.target.value
                }))}
              />
            )}
            <button onClick={() => handleSave(field)}>Save</button>
            <button onClick={() => setIsEditing(null)}>Cancel</button>
          </div>
        ) : (
          <div className="display-value">
            {field === 'height' ? 
              `${value?.feet}'${value?.inches}"` : 
              value}
            <button onClick={() => handleEdit(field)}>Edit</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="profile-container">
      <h2>Your Profile</h2>
      {loading ? (
        <div className="loading">Loading survey data...</div>
      ) : error ? (
        <div className="error">Error: {error}</div>
      ) : !surveyData ? (
        <div className="no-data">No survey data available</div>
      ) : (
        <div className="survey-results">
          {renderField('mealSwipes', 'Meal Swipes')}
          {renderField('distanceImportance', 'Distance Preference')}
          {renderField('height', 'Height')}
          {renderField('weight', 'Weight')}
          {renderField('workout', 'Workout Status')}
          {surveyData.workout === 'Yes' && (
            <>
              {renderField('liftingFrequency', 'Weekly Lifting Sessions')}
              {renderField('cardioFrequency', 'Weekly Cardio Sessions')}
              {renderField('workoutDuration', 'Workout Duration')}
            </>
          )}
          <div className="dietary-restrictions">
            <h3>Dietary Restrictions</h3>
            <ul>
              {surveyData.dietaryRestrictions.map((restriction, index) => (
                <li key={index}>{restriction}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;