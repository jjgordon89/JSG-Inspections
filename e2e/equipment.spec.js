import { test, expect } from '@playwright/test';

test.describe('Equipment Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Login first
    const usernameInput = page.locator('input[type="text"], input[placeholder*="username" i]').first();
    const passwordInput = page.locator('input[type="password"], input[placeholder*="password" i]').first();
    const loginButton = page.locator('button:has-text("Login"), button:has-text("Sign In")');
    
    if (await usernameInput.isVisible()) {
      await usernameInput.fill('admin');
      await passwordInput.fill('admin123');
      await loginButton.click();
      
      // Wait for login to complete
      await expect(page.locator('text=Dashboard, text=Equipment, text=Inspections')).toBeVisible({ timeout: 10000 });
    }
    
    // Navigate to equipment section
    const equipmentLink = page.locator('text=Equipment, a:has-text("Equipment"), button:has-text("Equipment")');
    if (await equipmentLink.isVisible()) {
      await equipmentLink.click();
    }
  });

  test('should display equipment list', async ({ page }) => {
    await expect(page.locator('text=Equipment, text="Equipment List", text="Equipment Management"')).toBeVisible();
    
    // Should show equipment table or cards
    await expect(page.locator('table, .equipment-card, .equipment-item, .equipment-list')).toBeVisible({ timeout: 5000 });
  });

  test('should open add equipment form', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create"), text="Add Equipment"');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Should show form fields
      await expect(page.locator('input[placeholder*="name" i], input[name*="name"], label:has-text("Name")')).toBeVisible();
      await expect(page.locator('select, input[placeholder*="type" i], label:has-text("Type")')).toBeVisible();
    }
  });

  test('should create new equipment', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create"), text="Add Equipment")');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Fill form
      const nameInput = page.locator('input[placeholder*="name" i], input[name*="name"]').first();
      const typeInput = page.locator('select, input[placeholder*="type" i]').first();
      const locationInput = page.locator('input[placeholder*="location" i], input[name*="location"]').first();
      
      await nameInput.fill('Test Equipment E2E');
      
      if (await typeInput.isVisible()) {
        if (await typeInput.locator('option').count() > 0) {
          await typeInput.selectOption({ index: 1 });
        } else {
          await typeInput.fill('Pressure Vessel');
        }
      }
      
      if (await locationInput.isVisible()) {
        await locationInput.fill('Test Building');
      }
      
      // Submit form
      const submitButton = page.locator('button:has-text("Save"), button:has-text("Create"), button:has-text("Add"), button[type="submit"]');
      await submitButton.click();
      
      // Should show success message or return to list
      await expect(page.locator('text="Test Equipment E2E", text="Equipment created", text="Success"')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should search equipment', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="search" i], input[type="search"], input[name*="search"]');
    
    if (await searchInput.isVisible()) {
      await searchInput.fill('Test');
      
      // Should filter results
      await page.waitForTimeout(1000); // Wait for search to process
      
      // Check if results are filtered (this is a basic check)
      const equipmentItems = page.locator('.equipment-card, .equipment-item, tr');
      if (await equipmentItems.count() > 0) {
        // At least one item should be visible
        await expect(equipmentItems.first()).toBeVisible();
      }
    }
  });

  test('should filter equipment by status', async ({ page }) => {
    const statusFilter = page.locator('select[name*="status"], select:has(option:has-text("Active")), select:has(option:has-text("Inactive"))');
    
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('active');
      
      // Wait for filter to apply
      await page.waitForTimeout(1000);
      
      // Should show filtered results
      const equipmentItems = page.locator('.equipment-card, .equipment-item, tr');
      if (await equipmentItems.count() > 0) {
        await expect(equipmentItems.first()).toBeVisible();
      }
    }
  });

  test('should view equipment details', async ({ page }) => {
    const equipmentItem = page.locator('.equipment-card, .equipment-item, tr').first();
    
    if (await equipmentItem.isVisible()) {
      // Click on equipment item or view button
      const viewButton = equipmentItem.locator('button:has-text("View"), button:has-text("Details"), a:has-text("View")');
      
      if (await viewButton.isVisible()) {
        await viewButton.click();
      } else {
        await equipmentItem.click();
      }
      
      // Should show equipment details
      await expect(page.locator('text="Equipment Details", text="Details", .equipment-details')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should edit equipment', async ({ page }) => {
    const equipmentItem = page.locator('.equipment-card, .equipment-item, tr').first();
    
    if (await equipmentItem.isVisible()) {
      // Find edit button
      const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit"), .edit-button').first();
      
      if (await editButton.isVisible()) {
        await editButton.click();
        
        // Should show edit form
        await expect(page.locator('input[name*="name"], input[placeholder*="name" i]')).toBeVisible();
        
        // Make a change
        const nameInput = page.locator('input[name*="name"], input[placeholder*="name" i]').first();
        await nameInput.fill('Updated Equipment Name');
        
        // Save changes
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update"), button[type="submit"]');
        await saveButton.click();
        
        // Should show success message
        await expect(page.locator('text="Updated", text="Success", text="Saved"')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle equipment deletion', async ({ page }) => {
    // First create a test equipment to delete
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")');
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      const nameInput = page.locator('input[placeholder*="name" i], input[name*="name"]').first();
      await nameInput.fill('Equipment To Delete');
      
      const submitButton = page.locator('button:has-text("Save"), button:has-text("Create"), button[type="submit"]');
      await submitButton.click();
      
      // Wait for creation
      await page.waitForTimeout(2000);
      
      // Now find and delete the equipment
      const deleteButton = page.locator('button:has-text("Delete"), .delete-button').first();
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Handle confirmation dialog if present
        const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")');
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
        
        // Should show success message
        await expect(page.locator('text="Deleted", text="Removed", text="Success"')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display equipment statistics', async ({ page }) => {
    // Should show some statistics or summary
    const statsElements = page.locator('.stats, .summary, .dashboard-card, text="Total", text="Active", text="Inactive"');
    
    if (await statsElements.count() > 0) {
      await expect(statsElements.first()).toBeVisible();
    }
  });
});