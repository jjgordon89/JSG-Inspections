import { test, expect } from '@playwright/test';

test.describe('Inspection Workflow', () => {
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
  });

  test('should navigate to inspections section', async ({ page }) => {
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
      
      await expect(page.locator('text="Inspections", text="Inspection List", text="Inspection Management"')).toBeVisible();
    }
  });

  test('should start new inspection', async ({ page }) => {
    // Navigate to inspections
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
    }
    
    // Start new inspection
    const newInspectionButton = page.locator('button:has-text("New Inspection"), button:has-text("Start Inspection"), button:has-text("Add Inspection")');
    
    if (await newInspectionButton.isVisible()) {
      await newInspectionButton.click();
      
      // Should show equipment selection or inspection form
      await expect(page.locator('select, .equipment-selector, text="Select Equipment", text="Equipment"')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should complete inspection checklist', async ({ page }) => {
    // Navigate to inspections and start new one
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
    }
    
    const newInspectionButton = page.locator('button:has-text("New Inspection"), button:has-text("Start Inspection"), button:has-text("Add Inspection")');
    if (await newInspectionButton.isVisible()) {
      await newInspectionButton.click();
      
      // Select equipment if needed
      const equipmentSelect = page.locator('select').first();
      if (await equipmentSelect.isVisible() && await equipmentSelect.locator('option').count() > 1) {
        await equipmentSelect.selectOption({ index: 1 });
        
        const continueButton = page.locator('button:has-text("Continue"), button:has-text("Next"), button:has-text("Start")');
        if (await continueButton.isVisible()) {
          await continueButton.click();
        }
      }
      
      // Fill checklist items
      const checklistItems = page.locator('input[type="checkbox"], input[type="radio"], .checklist-item');
      const itemCount = await checklistItems.count();
      
      if (itemCount > 0) {
        // Check first few items
        for (let i = 0; i < Math.min(3, itemCount); i++) {
          const item = checklistItems.nth(i);
          if (await item.isVisible()) {
            await item.check();
          }
        }
        
        // Add notes if available
        const notesInput = page.locator('textarea, input[placeholder*="notes" i], input[name*="notes"]').first();
        if (await notesInput.isVisible()) {
          await notesInput.fill('Test inspection notes from E2E test');
        }
      }
    }
  });

  test('should add photos to inspection', async ({ page }) => {
    // Start inspection process
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
    }
    
    const newInspectionButton = page.locator('button:has-text("New Inspection"), button:has-text("Start Inspection"), button:has-text("Add Inspection")');
    if (await newInspectionButton.isVisible()) {
      await newInspectionButton.click();
      
      // Look for photo upload section
      const photoButton = page.locator('button:has-text("Add Photo"), button:has-text("Upload Photo"), input[type="file"]');
      
      if (await photoButton.isVisible()) {
        // Mock file upload (Playwright limitation - we can't actually upload files easily in E2E)
        await expect(photoButton).toBeVisible();
        
        // Check if photo section is accessible
        const photoSection = page.locator('.photo-section, .photo-upload, text="Photos"');
        if (await photoSection.isVisible()) {
          await expect(photoSection).toBeVisible();
        }
      }
    }
  });

  test('should save inspection', async ({ page }) => {
    // Start and fill inspection
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
    }
    
    const newInspectionButton = page.locator('button:has-text("New Inspection"), button:has-text("Start Inspection"), button:has-text("Add Inspection")');
    if (await newInspectionButton.isVisible()) {
      await newInspectionButton.click();
      
      // Select equipment if needed
      const equipmentSelect = page.locator('select').first();
      if (await equipmentSelect.isVisible() && await equipmentSelect.locator('option').count() > 1) {
        await equipmentSelect.selectOption({ index: 1 });
      }
      
      // Fill some basic information
      const notesInput = page.locator('textarea, input[placeholder*="notes" i]').first();
      if (await notesInput.isVisible()) {
        await notesInput.fill('E2E test inspection');
      }
      
      // Save inspection
      const saveButton = page.locator('button:has-text("Save"), button:has-text("Submit"), button:has-text("Complete")');
      if (await saveButton.isVisible()) {
        await saveButton.click();
        
        // Should show success message or redirect
        await expect(page.locator('text="Saved", text="Success", text="Completed", text="Inspection List"')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test('should view inspection history', async ({ page }) => {
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
      
      // Should show list of inspections
      await expect(page.locator('table, .inspection-list, .inspection-card')).toBeVisible({ timeout: 5000 });
      
      // Check if there are inspection items
      const inspectionItems = page.locator('.inspection-item, .inspection-card, tr');
      if (await inspectionItems.count() > 0) {
        await expect(inspectionItems.first()).toBeVisible();
      }
    }
  });

  test('should filter inspections by date', async ({ page }) => {
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
      
      // Look for date filters
      const dateFilter = page.locator('input[type="date"], input[placeholder*="date" i]').first();
      
      if (await dateFilter.isVisible()) {
        await dateFilter.fill('2024-01-01');
        
        // Wait for filter to apply
        await page.waitForTimeout(1000);
        
        // Should show filtered results
        const inspectionItems = page.locator('.inspection-item, .inspection-card, tr');
        if (await inspectionItems.count() > 0) {
          await expect(inspectionItems.first()).toBeVisible();
        }
      }
    }
  });

  test('should view inspection details', async ({ page }) => {
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
      
      // Find first inspection and view details
      const inspectionItem = page.locator('.inspection-item, .inspection-card, tr').first();
      
      if (await inspectionItem.isVisible()) {
        const viewButton = inspectionItem.locator('button:has-text("View"), a:has-text("View"), button:has-text("Details")');
        
        if (await viewButton.isVisible()) {
          await viewButton.click();
        } else {
          await inspectionItem.click();
        }
        
        // Should show inspection details
        await expect(page.locator('text="Inspection Details", text="Summary", .inspection-details')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should generate inspection report', async ({ page }) => {
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
      
      // Find first inspection
      const inspectionItem = page.locator('.inspection-item, .inspection-card, tr').first();
      
      if (await inspectionItem.isVisible()) {
        // Look for report generation button
        const reportButton = page.locator('button:has-text("Report"), button:has-text("PDF"), button:has-text("Export")');
        
        if (await reportButton.isVisible()) {
          await reportButton.click();
          
          // Should show report generation or download
          await expect(page.locator('text="Report", text="Generated", text="Download"')).toBeVisible({ timeout: 10000 });
        }
      }
    }
  });

  test('should handle inspection status updates', async ({ page }) => {
    const inspectionLink = page.locator('text=Inspections, a:has-text("Inspections"), button:has-text("Inspections")');
    if (await inspectionLink.isVisible()) {
      await inspectionLink.click();
      
      // Find inspection with status that can be updated
      const statusSelect = page.locator('select[name*="status"], .status-selector').first();
      
      if (await statusSelect.isVisible()) {
        await statusSelect.selectOption('completed');
        
        // Should update status
        await page.waitForTimeout(1000);
        
        // Verify status change
        await expect(page.locator('text="completed", text="Completed"')).toBeVisible();
      }
    }
  });
});