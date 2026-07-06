import { test, expect } from '@playwright/test'

test.describe('Pocket Money smoke tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      try { indexedDB.deleteDatabase('pocket-money-db') } catch (e) {}
    })
    await page.reload()
  })

  async function completeOnboarding(page, username = 'Test User', pin = '1234') {
    await expect(page.locator('text=Your money, private')).toBeVisible()
    for (let i = 0; i < 4; i++) {
      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Get Started")').last()
      await expect(nextBtn).toBeVisible()
      await nextBtn.click()
    }
    await page.fill('input[placeholder="Your name"]', username)
    await page.locator('input[placeholder="PIN"]').fill(pin)
    await page.locator('input[placeholder="Confirm"]').fill(pin)
    await page.click('button:has-text("Create Account")')
  }

  async function createAccount(page, name, balance) {
    await page.click('button:has-text("Accounts")')
    await page.click('button[aria-label="Add account"]')
    await page.fill('input[placeholder="e.g. Commercial Bank"]', name)
    await page.fill('input[type="number"]', String(balance))
    await page.click('button:has-text("Create Account")')
    await expect(page.locator(`text=${name}`).first()).toBeVisible()
  }

  async function addTransaction(page, amountDigits, accountName, categoryName) {
    await page.click('button[aria-label="Add transaction"]')
    await expect(page.locator('text=Add Transaction')).toBeVisible()
    for (const digit of amountDigits) {
      await page.click(`button[aria-label="Number ${digit}"]`)
    }
    await page.click('button:has-text("Continue")')
    await page.getByRole('button', { name: accountName }).last().click()
    await page.getByRole('button', { name: categoryName }).last().click()
    await page.getByRole('button', { name: 'Save', exact: true }).click()
  }

  test('onboarding creates a user and shows dashboard', async ({ page }) => {
    await completeOnboarding(page)
    await expect(page.locator('text=Good day,')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=LKR 0.00').first()).toBeVisible()
  })

  test('can add an account', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await expect(page.locator('text=LKR 50,000.00').first()).toBeVisible()
  })

  test('can add a transaction', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await page.click('button:has-text("Home")')
    await addTransaction(page, ['1', '5', '0', '0'], 'Commercial Bank', 'Food & Dining')
    await expect(page.locator('text=LKR 1,500.00').first()).toBeVisible()
  })

  test('can delete a transaction', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await page.click('button:has-text("Home")')
    await addTransaction(page, ['1', '5', '0', '0'], 'Commercial Bank', 'Food & Dining')
    await expect(page.locator('text=LKR 1,500.00').first()).toBeVisible()

    await page.click('button:has-text("Transactions")')
    await expect(page.locator('text=LKR 1,500.00').first()).toBeVisible()
    page.on('dialog', (dialog) => dialog.accept())
    await page.click('button[aria-label="More actions"]')
    await page.click('text=Delete')
    await expect(page.locator('text=No transactions found.')).toBeVisible()
  })

  test('can add a budget', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button:has-text("Budgets")')
    await page.click('button:has-text("Create a budget")')
    await page.fill('input[type="number"]', '20000')
    await page.click('button:has-text("Create Budget")')
    await expect(page.locator('text=LKR 0.00 of LKR 20,000.00')).toBeVisible()
  })

  test('settings change PIN modal opens', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button:has-text("More")')
    await page.click('text=Settings')
    await page.click('text=Change PIN')
    await expect(page.locator('input[placeholder="Current PIN"]')).toBeVisible()
  })
})
