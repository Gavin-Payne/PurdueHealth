import React, { useState, useEffect } from 'react';
import './WorkoutPlan.css';

const WorkoutPlan = ({ userId, token }) => {
  const [workoutPlan, setWorkoutPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchWorkoutPlan = async () => {
      // Don't fetch if we already have the plan
      if (workoutPlan) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/workout-plan/${userId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch workout plan');
        }

        if (mounted) {
          console.log('Received workout plan:', data);
          setWorkoutPlan(data);
        }
      } catch (err) {
        console.error('Error fetching workout plan:', err);
        if (mounted) {
          setError(err.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (userId && token) {
      fetchWorkoutPlan();
    }

    return () => {
      mounted = false;
    };
  }, [userId, token, workoutPlan]);

  if (loading) {
    return <div className="workout-plan-loading">Loading your personalized workout plan...</div>;
  }

  if (error) {
    return <div className="workout-plan-error">Error: {error}</div>;
  }

  if (!workoutPlan?.schedule) {
    return <div className="workout-plan-empty">No workout plan available</div>;
  }

  return (
    <div className="workout-plan-container">
      <h2>Your Personalized Workout Plan</h2>
      <div className="workout-schedule">
        {workoutPlan.schedule.map((day, index) => (
          <div key={index} className="workout-day">
            <h3>{day.name}</h3>
            <div className="exercises">
              {day.exercises?.map((exercise, idx) => (
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