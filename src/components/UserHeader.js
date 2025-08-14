import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import './UserHeader.css';

const UserHeader = () => {
  const { currentUser, logout, canAdmin } = useUser();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: '#e53e3e',
      inspector: '#3182ce',
      reviewer: '#38a169',
      viewer: '#805ad5'
    };
    return colors[role] || '#718096';
  };

  const getRoleDisplayName = (role) => {
    const names = {
      admin: 'Administrator',
      inspector: 'Inspector',
      reviewer: 'Reviewer',
      viewer: 'Viewer'
    };
    return names[role] || role;
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div className="user-header">
      <div className="user-info">
        <div className="user-details">
          <span className="user-name">{currentUser.full_name}</span>
          <span 
            className="user-role"
            style={{ color: getRoleColor(currentUser.role) }}
          >
            {getRoleDisplayName(currentUser.role)}
          </span>
        </div>
        <div 
          className="user-avatar"
          onClick={() => setShowDropdown(!showDropdown)}
          style={{ backgroundColor: getRoleColor(currentUser.role) }}
        >
          {currentUser.full_name.charAt(0).toUpperCase()}
        </div>
      </div>

      {showDropdown && (
        <div className="user-dropdown">
          <div className="dropdown-header">
            <div className="dropdown-user-name">{currentUser.full_name}</div>
            <div className="dropdown-user-email">{currentUser.email || currentUser.username}</div>
            <div 
              className="dropdown-user-role"
              style={{ color: getRoleColor(currentUser.role) }}
            >
              {getRoleDisplayName(currentUser.role)}
            </div>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <div className="dropdown-actions">
            {canAdmin() && (
              <button className="dropdown-action">
                <span className="action-icon">👥</span>
                User Management
              </button>
            )}
            
            <button className="dropdown-action">
              <span className="action-icon">📊</span>
              My Activity
            </button>
            
            <button className="dropdown-action">
              <span className="action-icon">⚙️</span>
              Preferences
            </button>
          </div>
          
          <div className="dropdown-divider"></div>
          
          <button 
            className="dropdown-action logout-action"
            onClick={handleLogout}
          >
            <span className="action-icon">🚪</span>
            Sign Out
          </button>
        </div>
      )}

      {showDropdown && (
        <div 
          className="dropdown-overlay"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default UserHeader;
