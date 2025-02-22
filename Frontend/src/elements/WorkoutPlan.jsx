import React, { useState, useEffect } from 'react';
import './WorkoutPlan.css';

const WorkoutPlan = ({ userId, token, workoutPlan: initialWorkoutPlan }) => {
  const [workoutPlan, setWorkoutPlan] = useState(initialWorkoutPlan);
  const [loading, setLoading] = useState(!initialWorkoutPlan);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchWorkoutPlan = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/workout-plan/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch workout plan');
        }

        const data = await response.json();
        console.log('Received workout plan:', data);
        setWorkoutPlan(data);
      } catch (err) {
        console.error('Error fetching workout plan:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!workoutPlan && userId) {
      fetchWorkoutPlan();
    }
  }, [userId, token, workoutPlan]);

  if (loading) return <div>Loading your personalized workout plan...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!workoutPlan) return <div>No workout plan available</div>;

  return (
    <div className="workout-plan-container">
      <h2>Your Personalized Workout Plan</h2>
      <div className="workout-schedule">
        {workoutPlan.schedule.map((day, index) => (
          <div key={index} className="workout-day">
            <h3>{day.name}</h3>
            <div className="exercises">
              {day.exercises.map((exercise, idx) => (
                <div key={idx} className="exercise">
                  <h4>{exercise.name}</h4>
                  <p>{exercise.sets} sets × {exercise.reps} reps</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutPlan;