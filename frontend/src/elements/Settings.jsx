import React from 'react';
import './Settings.css';

const Settings = ({ isDarkMode, toggleDarkMode }) => {
  return (
    <div className="settings-container">
      <h2>Settings</h2>
      <div className="setting-item">
        <label htmlFor="darkMode">Dark Mode</label>
        <label className="toggle-switch">
          <input
            type="checkbox"
            id="darkMode"
            checked={isDarkMode}
            onChange={toggleDarkMode}
          />
          <span className="toggle-slider"></span>
        </label>
      </div>
    </div>
  );
};

export default Settings;