import { test, expect } from '@playwright/test'

test.describe('Pocket Money smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      try {
        indexedDB.deleteDatabase('pocket-money-db')
      } catch (e) {}
    })
    await page.reload()
  })

  async function completeOnboarding(page, username = 'Test User', pin = '1234') {
    for (let i = 0; i < 4; i++) {
      await page.click('button:has-text("Next"), button:has-text("Get Started")')
    }
    await page.fill('input[placeholder="Your name"]', username)
    await page.locator('input[placeholder="PIN"]').fill(pin)
    await page.locator('input[placeholder="Confirm"]').fill(pin)
    await page.click('button:has-text("Create Account")')
  }

  test('onboarding creates a user and shows dashboard', async ({ page }) => {
    await completeOnboarding(page)
    await expect(page.locator('text=Good day, Test User')).toBeVisible({ timeout: 10000 })
  })

  test('can add an account', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button:has-text("Accounts")')
    await page.click('text=Add Account')
    await page.fill('input[placeholder="Account name"]', 'Commercial Bank')
    await page.fill('input[type="number"]', '50000')
    await page.click('text=Save')
    await expect(page.locator('text=Commercial Bank')).toBeVisible()
  })

  test('can add a transaction', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button[aria-label="Add transaction"]')
    await page.click('button:has-text("1")')
    await page.click('button:has-text("5")')
    await page.click('button:has-text("0")')
    await page.click('button:has-text("0")')
    await page.click('text=Continue')
    await page.click('text=Save')
    await expect(page.locator('text=LKR 1,500.00').first()).toBeVisible()
  })

  test('settings change PIN modal opens', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button:has-text("More")')
    await page.click('text=Settings')
    await page.click('text=Change PIN')
    await expect(page.locator('text=Current PIN')).toBeVisible()
  })
})
