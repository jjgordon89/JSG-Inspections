import React from 'react';
import './Settings.css';

function Settings() {
  const handleBackup = async () => {
    await window.api.backupDatabase();
    alert('Backup complete!');
  };

  const handleRestore = async () => {
    if (window.confirm('Restoring the database will overwrite current data and restart the application. Are you sure you want to continue?')) {
      await window.api.restoreDatabase();
    }
  };

  return (
    <div className="settings-container">
      <h2>Settings</h2>
      <div className="settings-section">
        <h3>Data Management</h3>
        <button onClick={handleBackup}>Backup Database</button>
        <button onClick={handleRestore}>Restore Database</button>
      </div>
    </div>
  );
}

export default Settings;