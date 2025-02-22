import React, { useState, useEffect } from 'react';
import './Survey.css';

const Survey = ({ userId, token, onComplete }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({
    dietaryRestrictions: [],
    mealSwipes: '',
    distanceImportance: '',
    height: { feet: '', inches: '' },
    weight: '',
    workout: '',
    liftingFrequency: '',
    cardioFrequency: '',
    workoutDuration: '',
    wantsPlan: ''
  });

  const [showWorkoutQuestions, setShowWorkoutQuestions] = useState(false);
  const [needsSurvey, setNeedsSurvey] = useState(true);

  useEffect(() => {
    checkSurveyStatus(userId);
  }, [userId]);

  const questions = [
    {
      id: 'dietaryRestrictions',
      type: 'multiSelect',
      text: 'Select dietary restrictions (select all that apply):',
      options: ['Gluten Free', 'Soy Free', 'Vegetarian', 'Vegan', 'Lactose Free', 'Egg Free', 'Seafood Free']
    },
    {
      id: 'mealSwipes',
      type: 'singleSelect',
      text: 'How many meal swipes do you have?',
      options: ['0', '7', '10', '14', 'Unlimited']
    },
    {
      id: 'distanceImportance',
      type: 'singleSelect',
      text: 'How important is distance when choosing a place to eat?',
      options: ['Not at all', 'Not very', 'Somewhat', 'Very']
    },
    {
      id: 'height',
      type: 'height',
      text: 'What is your height?'
    },
    {
      id: 'weight',
      type: 'number',
      text: 'What is your weight (in pounds)?'
    },
    {
      id: 'workout',
      type: 'singleSelect',
      text: 'Do you workout or want to start working out?',
      options: ['Yes', 'No']
    }
  ];

  const workoutQuestions = [
    {
      id: 'liftingFrequency',
      type: 'singleSelect',
      text: 'How many times do you plan on lifting weights each week?',
      options: ['1', '2', '3', '4', '5', '6', '7']
    },
    {
      id: 'cardioFrequency',
      type: 'singleSelect',
      text: 'How many times do you plan on doing cardio each week?',
      options: ['1', '2', '3', '4', '5', '6', '7']
    },
    {
      id: 'workoutDuration',
      type: 'singleSelect',
      text: 'How long do you usually workout for?',
      options: ['15 min', '30 min', '45 min', '60 min', '75 min', '90 min', 'More']
    },
    {
      id: 'wantsPlan',
      type: 'singleSelect',
      text: 'Are you interested in a plan tailored just for you?',
      options: ['Yes', 'No']
    }
  ];

  const handleMultiSelect = (option) => {
    setAnswers(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(option)
        ? prev.dietaryRestrictions.filter(item => item !== option)
        : [...prev.dietaryRestrictions, option]
    }));
  };

  const handleSingleSelect = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));

    if (questionId === 'workout' && answer === 'Yes') {
      setShowWorkoutQuestions(true);
    }
  };

  const handleHeightChange = (type, value) => {
    if (type === 'feet' && (value < 0 || value > 8)) return;
    if (type === 'inches' && (value < 0 || value > 11)) return;

    setAnswers(prev => ({
      ...prev,
      height: {
        ...prev.height,
        [type]: value
      }
    }));
  };

  const handleWeightChange = (value) => {
    if (value < 0) return;
    setAnswers(prev => ({
      ...prev,
      weight: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (!userId) {
        console.error('No userId provided');
        return;
      }

      // Log the payload for debugging
      const payload = {
        userId: userId,
        answers: {
          dietaryRestrictions: answers.dietaryRestrictions,
          mealSwipes: answers.mealSwipes,
          distanceImportance: answers.distanceImportance,
          height: answers.height,
          weight: answers.weight,
          workout: answers.workout,
          liftingFrequency: answers.liftingFrequency,
          cardioFrequency: answers.cardioFrequency,
          workoutDuration: answers.workoutDuration,
          wantsPlan: answers.wantsPlan
        }
      };

      console.log('Submitting survey with payload:', payload);

      const response = await fetch('http://localhost:5000/api/survey', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log('Survey submitted successfully');
        onComplete();
      } else {
        const errorData = await response.json();
        console.error('Failed to submit survey:', errorData);
        throw new Error(errorData.message || 'Failed to submit survey');
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
    }
  };

  const checkSurveyStatus = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/survey/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to check survey status');
      }
      
      const data = await response.json();
      setNeedsSurvey(!data.hasTakenSurvey);
    } catch (error) {
      console.error('Error checking survey status:', error);
      setNeedsSurvey(true);
    }
  };

  const renderQuestion = () => {
    const currentQuestionData = questions[currentQuestion];

    switch (currentQuestionData.type) {
      case 'multiSelect':
        return (
          <div className="question-container">
            <h3>{currentQuestionData.text}</h3>
            <div className="options-container">
              {currentQuestionData.options.map(option => (
                <label key={option} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={answers.dietaryRestrictions.includes(option)}
                    onChange={() => handleMultiSelect(option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        );

      case 'height':
        return (
          <div className="question-container">
            <h3>{currentQuestionData.text}</h3>
            <div className="height-inputs">
              <input
                type="number"
                value={answers.height.feet}
                onChange={(e) => handleHeightChange('feet', e.target.value)}
                placeholder="Feet"
                min="0"
                max="8"
              />
              <input
                type="number"
                value={answers.height.inches}
                onChange={(e) => handleHeightChange('inches', e.target.value)}
                placeholder="Inches"
                min="0"
                max="11"
              />
            </div>
          </div>
        );

      case 'number':
        return (
          <div className="question-container">
            <h3>{currentQuestionData.text}</h3>
            <input
              type="number"
              value={answers.weight}
              onChange={(e) => handleWeightChange(e.target.value)}
              placeholder="Weight in pounds"
              min="0"
            />
          </div>
        );

      default:
        return (
          <div className="question-container">
            <h3>{currentQuestionData.text}</h3>
            <div className="options-container">
              {currentQuestionData.options.map(option => (
                <label key={option} className="radio-label">
                  <input
                    type="radio"
                    checked={answers[currentQuestionData.id] === option}
                    onChange={() => handleSingleSelect(currentQuestionData.id, option)}
                  />
                  {option}
                </label>
              ))}
            </div>
          </div>
        );
    }
  };

  const renderWorkoutQuestions = () => {
    const currentWorkoutQuestion = workoutQuestions[currentQuestion - questions.length];
    
    return (
      <div className="question-container">
        <h3>{currentWorkoutQuestion.text}</h3>
        <div className="options-container">
          {currentWorkoutQuestion.options.map(option => (
            <label key={option} className="radio-label">
              <input
                type="radio"
                checked={answers[currentWorkoutQuestion.id] === option}
                onChange={() => handleSingleSelect(currentWorkoutQuestion.id, option)}
              />
              {option}
            </label>
          ))}
        </div>
        <div className="navigation-buttons">
          <button onClick={() => setCurrentQuestion(prev => prev - 1)}>
            Previous
          </button>
          {currentQuestion - questions.length < workoutQuestions.length - 1 && (
            <button onClick={() => setCurrentQuestion(prev => prev + 1)}>
              Next
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="survey-container">
      {currentQuestion < questions.length ? (
        <>
          {renderQuestion()}
          <div className="navigation-buttons">
            {currentQuestion > 0 && (
              <button onClick={() => setCurrentQuestion(prev => prev - 1)}>
                Previous
              </button>
            )}
            <button onClick={() => setCurrentQuestion(prev => prev + 1)}>
              Next
            </button>
          </div>
        </>
      ) : showWorkoutQuestions ? (
        <>
          {renderWorkoutQuestions()}
          <button onClick={handleSubmit}>Submit Survey</button>
        </>
      ) : (
        <button onClick={handleSubmit}>Submit Survey</button>
      )}
    </div>
  );
};

export default Survey;