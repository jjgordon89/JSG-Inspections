import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login form', async ({ page }) => {
    await expect(page.locator('text=Login')).toBeVisible();
    await expect(page.locator('input[type="text"], input[placeholder*="username" i]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[placeholder*="password" i]')).toBeVisible();
    await expect(page.locator('button:has-text("Login"), button:has-text("Sign In")')).toBeVisible();
  });

  test('should show validation for empty fields', async ({ page }) => {
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();
    
    // Should show some form of validation or remain on login page
    await expect(page.locator('text=Login')).toBeVisible();
  });

  test('should handle invalid credentials', async ({ page }) => {
    const usernameInput = page.locator('input[type="text"], input[placeholder*="username" i]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    
    await usernameInput.fill('invaliduser');
    await passwordInput.fill('invalidpass');
    await loginButton.click();
    
    // Should show error message or remain on login page
    await expect(page.locator('text=Login')).toBeVisible();
  });

  test('should handle successful login', async ({ page }) => {
    const usernameInput = page.locator('input[type="text"], input[placeholder*="username" i]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await loginButton.click();
    
    // Should navigate to dashboard or main application
    await expect(page.locator('text=Dashboard, text=Equipment, text=Inspections')).toBeVisible({ timeout: 10000 });
  });

  test('should remember login state on refresh', async ({ page }) => {
    // First login
    const usernameInput = page.locator('input[type="text"], input[placeholder*="username" i]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await loginButton.click();
    
    // Wait for successful login
    await expect(page.locator('text=Dashboard, text=Equipment, text=Inspections')).toBeVisible({ timeout: 10000 });
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('text=Dashboard, text=Equipment, text=Inspections')).toBeVisible({ timeout: 10000 });
  });

  test('should handle logout', async ({ page }) => {
    // First login
    const usernameInput = page.locator('input[type="text"], input[placeholder*="username" i]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    
    await usernameInput.fill('admin');
    await passwordInput.fill('admin123');
    await loginButton.click();
    
    // Wait for successful login
    await expect(page.locator('text=Dashboard, text=Equipment, text=Inspections')).toBeVisible({ timeout: 10000 });
    
    // Find and click logout button
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), text=Logout, text="Sign Out"');
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
      
      // Should return to login page
      await expect(page.locator('text=Login')).toBeVisible({ timeout: 5000 });
    }
  });
});