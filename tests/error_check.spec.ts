import { test, expect } from '@playwright/test';

test('check page for errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  await page.goto('http://localhost:4173');
  await page.waitForTimeout(2000);
  
  if (errors.length > 0) {
    console.log('Errors found:', errors);
  } else {
    console.log('No errors found');
  }
});
