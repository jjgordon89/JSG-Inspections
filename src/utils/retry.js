/**
 * Retry utility for handling transient failures
 */

/**
 * Retries a function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.baseDelay - Base delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 10000)
 * @param {Function} options.shouldRetry - Function to determine if error should be retried
 * @returns {Promise} The result of the function or the final error
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    shouldRetry = (error) => error?.error?.retryable === true
  } = options;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await fn();
      
      // If the result indicates an error but it's not retryable, return immediately
      if (window.api?.isError(result) && !shouldRetry(result)) {
        return result;
      }
      
      // If it's a successful result or non-retryable error, return it
      if (!window.api?.isError(result)) {
        return result;
      }
      
      // Store the error for potential retry
      lastError = result;
      
      // If this is the last attempt, don't wait
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt or error is not retryable, break
      if (attempt === maxRetries || !shouldRetry(error)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return lastError;
}

/**
 * Retries a database read operation
 * @param {Function} dbOperation - The database operation to retry
 * @param {Object} options - Retry options
 * @returns {Promise} The result of the operation
 */
export function retryDatabaseRead(dbOperation, options = {}) {
  return retryWithBackoff(dbOperation, {
    maxRetries: 3,
    baseDelay: 500,
    maxDelay: 5000,
    shouldRetry: (result) => {
      // Retry on network errors, timeouts, or database locks
      if (window.api?.isError(result)) {
        const errorCode = result.error?.code;
        return ['SQLITE_BUSY', 'SQLITE_LOCKED', 'NETWORK_ERROR', 'TIMEOUT'].includes(errorCode) ||
               result.error?.retryable === true;
      }
      return false;
    },
    ...options
  });
}

/**
 * Makes a write operation idempotent by checking if it already succeeded
 * @param {Function} checkFn - Function to check if operation already succeeded
 * @param {Function} writeFn - The write operation to perform
 * @param {Object} options - Options
 * @returns {Promise} The result of the operation
 */
export async function makeIdempotent(checkFn, writeFn, options = {}) {
  try {
    // First check if the operation already succeeded
    const checkResult = await checkFn();
    
    if (!window.api?.isError(checkResult) && checkResult.data) {
      console.log('Operation already completed, skipping write');
      return checkResult;
    }
  } catch (error) {
    // If check fails, proceed with write operation
    console.log('Check operation failed, proceeding with write:', error);
  }
  
  // Perform the write operation
  return await writeFn();
}

/**
 * Wraps a database operation with user-friendly error handling
 * @param {Function} operation - The database operation
 * @param {Function} showToast - Toast notification function
 * @param {string} operationName - Human-readable operation name
 * @param {Object} options - Options
 * @returns {Promise} The result of the operation
 */
export async function withErrorHandling(operation, showToast, operationName, options = {}) {
  const { 
    successMessage,
    retryable = false,
    onSuccess,
    onError 
  } = options;
  
  try {
    let result;
    
    if (retryable) {
      result = await retryDatabaseRead(operation);
    } else {
      result = await operation();
    }
    
    if (window.api?.isError(result)) {
      const errorMessage = window.api.getErrorMessage(result);
      console.error(`${operationName} failed:`, result.error);
      
      if (showToast) {
        showToast(`${operationName} failed: ${errorMessage}`, 'error');
      }
      
      if (onError) {
        onError(result);
      }
      
      return result;
    }
    
    // Success case
    if (successMessage && showToast) {
      showToast(successMessage, 'success');
    }
    
    if (onSuccess) {
      onSuccess(result);
    }
    
    return result;
    
  } catch (error) {
    console.error(`${operationName} failed with exception:`, error);
    
    if (showToast) {
      showToast(`${operationName} failed: ${error.message}`, 'error');
    }
    
    if (onError) {
      onError(error);
    }
    
    throw error;
  }
}
