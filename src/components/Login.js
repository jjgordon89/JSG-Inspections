import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await login(username.trim());
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (role) => {
    const defaultUsers = {
      admin: 'admin',
      inspector: 'inspector',
      reviewer: 'reviewer',
      viewer: 'viewer'
    };

    setUsername(defaultUsers[role]);
    setIsLoading(true);
    setError('');

    try {
      await login(defaultUsers[role]);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>JSG Inspections</h1>
          <p>Please sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="quick-login-section">
          <p className="quick-login-title">Quick Login (Demo)</p>
          <div className="quick-login-buttons">
            <button 
              onClick={() => handleQuickLogin('admin')}
              disabled={isLoading}
              className="quick-login-btn admin"
            >
              Admin
            </button>
            <button 
              onClick={() => handleQuickLogin('inspector')}
              disabled={isLoading}
              className="quick-login-btn inspector"
            >
              Inspector
            </button>
            <button 
              onClick={() => handleQuickLogin('reviewer')}
              disabled={isLoading}
              className="quick-login-btn reviewer"
            >
              Reviewer
            </button>
            <button 
              onClick={() => handleQuickLogin('viewer')}
              disabled={isLoading}
              className="quick-login-btn viewer"
            >
              Viewer
            </button>
          </div>
        </div>

        <div className="login-footer">
          <p>JSG Inspections - Compliance Management System</p>
        </div>
      </div>
    </div>
  );
};

export default Login;
