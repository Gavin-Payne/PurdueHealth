import React, { useState, useEffect } from 'react';
import './Profile.css';

const Profile = ({ userId, token }) => {
  const [surveyData, setSurveyData] = useState(null);
  const [isEditing, setIsEditing] = useState(null);
  const [editedValue, setEditedValue] = useState({});

  useEffect(() => {
    fetchSurveyData();
  }, [userId]);

  const fetchSurveyData = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/survey/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      setSurveyData(data.surveyData);
    } catch (error) {
      console.error('Error fetching survey data:', error);
    }
  };

  const handleEdit = (field) => {
    setIsEditing(field);
    setEditedValue({ ...surveyData[field] });
  };

  const handleSave = async (field) => {
    try {
      const response = await fetch(`http://localhost:5000/api/survey/update/${userId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          field,
          value: editedValue[field]
        })
      });

      if (response.ok) {
        setSurveyData(prev => ({
          ...prev,
          [field]: editedValue[field]
        }));
        setIsEditing(null);
      }
    } catch (error) {
      console.error('Error updating survey data:', error);
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
      {surveyData ? (
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
      ) : (
        <p>Loading survey data...</p>
      )}
    </div>
  );
};

export default Profile;