import React, { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext();

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Initialize user session on app start
  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      setIsLoading(true);
      
      // Check if there's a stored session
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        
        // Verify user still exists and is active
        const dbUser = await window.api.secureOperation('users', 'getByUsername', { username: user.username });
        if (dbUser && dbUser.active) {
          setCurrentUser(dbUser);
          setIsAuthenticated(true);
          
          // Update last login
          await window.api.secureOperation('users', 'updateLastLogin', { id: dbUser.id });
        } else {
          // User no longer exists or is inactive, clear session
          localStorage.removeItem('currentUser');
        }
      }
    } catch (error) {
      console.error('Error initializing user session:', error);
      localStorage.removeItem('currentUser');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username) => {
    try {
      setIsLoading(true);
      
      // Get user from database
      const user = await window.api.secureOperation('users', 'getByUsername', { username });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      if (!user.active) {
        throw new Error('User account is inactive');
      }
      
      // Set user context
      setCurrentUser(user);
      setIsAuthenticated(true);
      
      // Store session
      localStorage.setItem('currentUser', JSON.stringify(user));
      
      // Update last login
      await window.api.secureOperation('users', 'updateLastLogin', { id: user.id });
      
      // Log the login action
      await window.api.secureOperation('auditLog', 'create', {
        userId: user.id,
        username: user.username,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        oldValues: null,
        newValues: JSON.stringify({ last_login: new Date().toISOString() }),
        ipAddress: 'localhost', // In Electron app, this would be localhost
        userAgent: navigator.userAgent
      });
      
      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        // Log the logout action
        await window.api.secureOperation('auditLog', 'create', {
          userId: currentUser.id,
          username: currentUser.username,
          action: 'logout',
          entityType: 'user',
          entityId: currentUser.id,
          oldValues: null,
          newValues: null,
          ipAddress: 'localhost',
          userAgent: navigator.userAgent
        });
      }
    } catch (error) {
      console.error('Error logging logout:', error);
    }
    
    // Clear user context
    setCurrentUser(null);
    setIsAuthenticated(false);
    
    // Clear stored session
    localStorage.removeItem('currentUser');
  };

  const createUser = async (userData) => {
    try {
      const newUser = await window.api.secureOperation('users', 'create', userData);
      
      // Log user creation
      if (currentUser) {
        await window.api.secureOperation('auditLog', 'create', {
          userId: currentUser.id,
          username: currentUser.username,
          action: 'create',
          entityType: 'user',
          entityId: newUser.lastID,
          oldValues: null,
          newValues: JSON.stringify(userData),
          ipAddress: 'localhost',
          userAgent: navigator.userAgent
        });
      }
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  };

  const getAllUsers = async () => {
    try {
      return await window.api.secureOperation('users', 'getAll', {});
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  };

  const hasPermission = (requiredRole) => {
    if (!currentUser) return false;
    
    const roleHierarchy = {
      'viewer': 1,
      'inspector': 2,
      'reviewer': 3,
      'admin': 4
    };
    
    const userLevel = roleHierarchy[currentUser.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;
    
    return userLevel >= requiredLevel;
  };

  const canEdit = () => hasPermission('inspector');
  const canReview = () => hasPermission('reviewer');
  const canAdmin = () => hasPermission('admin');

  const value = {
    currentUser,
    isLoading,
    isAuthenticated,
    login,
    logout,
    createUser,
    getAllUsers,
    hasPermission,
    canEdit,
    canReview,
    canAdmin
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
