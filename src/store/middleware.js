/**
 * Zustand Middleware - Custom middleware for cross-store communication and logging
 * 
 * This module provides middleware functions that can be applied to Zustand stores
 * to add functionality like logging, cross-store effects, and debugging.
 */

/**
 * Simple passthrough middleware that can be extended later
 * @param {Function} create - The Zustand create function
 * @returns {Function} The enhanced create function
 */
const withMiddleware = (create) => (set, get, api) => create(set, get, api);

/**
 * Logging middleware for development - logs state changes to console
 * @param {Function} create - The Zustand create function
 * @returns {Function} The enhanced create function with logging
 */
const withLogging = (create) => (set, get, api) => {
  const loggedSet = (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Store state change:', args);
    }
    return set(...args);
  };
  
  return create(loggedSet, get, api);
};

/**
 * Cross-store effects middleware - allows stores to react to changes in other stores
 * @param {Function} create - The Zustand create function
 * @returns {Function} The enhanced create function with cross-store effects
 */
const withEffects = (create) => (set, get, api) => {
  // Placeholder for cross-store effect logic
  // Can be extended to listen to other stores and trigger effects
  return create(set, get, api);
};

export default withMiddleware;
export { withLogging, withEffects };
