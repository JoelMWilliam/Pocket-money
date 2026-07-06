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

  async function addTransaction(page, amountDigits, accountName, categoryName, type = 'expense', note = '') {
    await page.click('button[aria-label="Add transaction"]')
    await expect(page.locator('text=Add Transaction')).toBeVisible()
    if (type !== 'expense') {
      const label = type === 'income' ? 'Income' : 'Transfer'
      await page.locator(`button:has-text("${label}")`).first().click()
    }
    for (const digit of amountDigits) {
      await page.click(`button[aria-label="Number ${digit}"]`)
    }
    await page.click('button:has-text("Continue")')
    if (type === 'transfer') {
      await page.getByRole('button', { name: accountName }).last().click()
      await page.getByRole('button', { name: categoryName }).last().click()
    } else {
      await page.getByRole('button', { name: accountName }).last().click()
      await page.getByRole('button', { name: categoryName }).last().click()
    }
    if (note) {
      await page.fill('input[placeholder="What\'s this for?"]', note)
    }
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

  test('can edit a transaction', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await page.click('button:has-text("Home")')
    await addTransaction(page, ['1', '5', '0', '0'], 'Commercial Bank', 'Food & Dining')
    await expect(page.locator('text=LKR 1,500.00').first()).toBeVisible()

    await page.click('button:has-text("Transactions")')
    await page.click('button[aria-label="More actions"]')
    await page.click('text=Edit')
    await expect(page.locator('text=Edit Transaction')).toBeVisible()
    await page.click('button[aria-label="Number 0"]')
    await page.click('button:has-text("Continue")')
    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.locator('text=LKR 15,000.00').first()).toBeVisible()
  })

  test('can transfer between accounts', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await createAccount(page, 'Cash', 10000)

    await page.click('button[aria-label="Add transaction"]')
    await expect(page.locator('text=Add Transaction')).toBeVisible()
    await page.click('text=Transfer')
    for (const digit of ['5', '0', '0', '0']) {
      await page.click(`button[aria-label="Number ${digit}"]`)
    }
    await page.click('button:has-text("Continue")')
    await page.getByRole('button', { name: 'Commercial Bank' }).last().click()
    await page.getByRole('button', { name: 'Cash' }).last().click()
    await page.click('text=Transfer')
    await page.getByRole('button', { name: 'Save', exact: true }).click()

    await page.click('button:has-text("Accounts")')
    await expect(page.locator('text=LKR 45,000.00').first()).toBeVisible()
    await expect(page.locator('text=LKR 15,000.00').first()).toBeVisible()
  })

  test('can add a budget', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button:has-text("Budgets")')
    await page.click('button:has-text("Create a budget")')
    await page.fill('input[type="number"]', '20000')
    await page.click('button:has-text("Create Budget")')
    await expect(page.locator('text=LKR 0.00 of LKR 20,000.00')).toBeVisible()
  })

  test('can add a goal', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button:has-text("More")')
    await page.getByRole('button', { name: /Goals/ }).click()
    await page.click('button[aria-label="Add goal"]')
    await page.fill('input[placeholder="e.g. Emergency Fund"]', 'Emergency Fund')
    await page.locator('input[type="number"]').nth(0).fill('200000')
    await page.locator('input[type="number"]').nth(1).fill('45000')
    await page.locator('input[type="date"]').fill('2026-12-31')
    await page.click('button:has-text("Create Goal")')
    await expect(page.locator('text=Emergency Fund')).toBeVisible()
    await expect(page.locator('text=LKR 45,000.00')).toBeVisible()
  })

  test('can add a debt', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button:has-text("More")')
    await page.getByRole('button', { name: /Debts/ }).click()
    await page.click('button[aria-label="Add debt"]')
    await page.fill('input[placeholder="Debt name"]', 'Car Loan')
    await page.fill('input[placeholder="Original amount"]', '1000000')
    await page.fill('input[placeholder="Current balance"]', '750000')
    await page.fill('input[placeholder="Interest rate %"]', '12')
    await page.fill('input[placeholder="Min payment"]', '25000')
    await page.click('button:has-text("Add Debt")')
    await expect(page.locator('text=Car Loan')).toBeVisible()
    await expect(page.locator('text=LKR 750,000.00').first()).toBeVisible()
  })

  test('settings change PIN modal opens', async ({ page }) => {
    await completeOnboarding(page)
    await page.click('button:has-text("More")')
    await page.getByRole('button', { name: /Settings/ }).click()
    await page.click('text=Change PIN')
    await expect(page.locator('input[placeholder="Current PIN"]')).toBeVisible()
  })

  test('can change PIN and login with new PIN', async ({ page }) => {
    await completeOnboarding(page, 'Test User', '1234')
    await page.click('button:has-text("More")')
    await page.getByRole('button', { name: /Settings/ }).click()
    await page.click('text=Change PIN')
    await page.locator('input[placeholder="Current PIN"]').fill('1234')
    await page.locator('input[placeholder="New PIN"]').fill('5678')
    await page.locator('input[placeholder="Confirm new PIN"]').fill('5678')
    await page.click('button:has-text("Update PIN")')

    // already back on Settings; log out
    await page.click('text=Log Out')
    await page.selectOption('select', 'testuser')
    await page.locator('input[type="password"]').fill('5678')
    await page.click('button:has-text("Unlock")')
    await page.click('button:has-text("Home")')
    await expect(page.locator('text=Good day,')).toBeVisible()
  })

  test('can switch theme color', async ({ page }) => {
    await completeOnboarding(page)
    const initialColor = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim())
    await page.click('button:has-text("More")')
    await page.getByRole('button', { name: /Settings/ }).click()
    await page.click('text=Accent Color')
    // pick the green color swatch (modal closes automatically)
    await page.locator('button[data-color="#30D158"]').click()
    await page.waitForTimeout(500)
    const newColor = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--md-sys-color-primary').trim())
    expect(newColor).not.toEqual(initialColor)
  })

  test('can add a recurring item', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await page.click('button:has-text("More")')
    await page.getByRole('button', { name: /Recurring/ }).click()
    await page.click('button[aria-label="Add recurring"]')
    await page.fill('input[placeholder="Name"]', 'Netflix')
    await page.fill('input[placeholder="Amount"]', '2500')
    await page.selectOption('select', { label: 'Expense' })
    await page.selectOption('select >> nth=1', { label: 'Bills & Utilities' })
    await page.selectOption('select >> nth=2', { label: 'Commercial Bank' })
    await page.click('button:has-text("Add Recurring")')
    await expect(page.locator('text=Netflix')).toBeVisible()
    await expect(page.locator('text=LKR 2,500.00').first()).toBeVisible()
  })

  test('can search transactions', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await page.click('button:has-text("Home")')
    await addTransaction(page, ['1', '5', '0', '0'], 'Commercial Bank', 'Food & Dining', 'expense', 'Lunch')
    await page.click('button:has-text("Transactions")')
    await page.fill('input[placeholder="Search note, amount, tags"]', 'Lunch')
    await expect(page.locator('text=LKR 1,500.00').first()).toBeVisible()
    await page.fill('input[placeholder="Search note, amount, tags"]', 'nothing')
    await expect(page.locator('text=No transactions found.')).toBeVisible()
  })

  test('can add an income transaction', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await page.click('button:has-text("Home")')
    await addTransaction(page, ['5', '0', '0', '0', '0'], 'Commercial Bank', 'Salary', 'income')
    await expect(page.locator('text=LKR 50,000.00').first()).toBeVisible()
  })

  test('can switch user', async ({ page }) => {
    await completeOnboarding(page, 'Alpha', '1234')
    await page.click('button:has-text("More")')
    await page.getByRole('button', { name: /Settings/ }).click()
    await page.click('text=Log Out')

    // create second user
    await page.click('button:has-text("Add New User")')
    await page.fill('input[placeholder="Your name"]', 'Beta')
    await page.locator('input[type="password"]').first().fill('5678')
    await page.locator('input[type="password"]').nth(1).fill('5678')
    await page.click('button:has-text("Create Account")')

    // switch back to alpha
    await page.click('button[aria-label="Switch user"]')
    await page.click('text=alpha')
    await page.locator('input[type="password"]').fill('1234')
    await page.click('button:has-text("Unlock")')
    await page.click('button:has-text("Home")')
    await expect(page.locator('text=Good day, alpha')).toBeVisible()
  })

  test('shows upcoming bills on dashboard', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await page.click('button:has-text("More")')
    await page.getByRole('button', { name: /Recurring/ }).click()
    await page.click('button[aria-label="Add recurring"]')
    await page.fill('input[placeholder="Name"]', 'Netflix')
    await page.fill('input[placeholder="Amount"]', '2500')
    await page.selectOption('select', { label: 'Expense' })
    await page.selectOption('select >> nth=1', { label: 'Bills & Utilities' })
    await page.selectOption('select >> nth=2', { label: 'Commercial Bank' })
    const today = new Date().toISOString().slice(0, 10)
    await page.locator('input[type="date"]').fill(today)
    await page.click('button:has-text("Add Recurring")')

    await page.click('button:has-text("Home")')
    await expect(page.getByRole('heading', { name: 'Upcoming Bills' })).toBeVisible()
    await expect(page.locator('text=Netflix')).toBeVisible()
    await expect(page.locator('text=LKR 2,500.00').first()).toBeVisible()
  })

  test('can reconcile an account', async ({ page }) => {
    await completeOnboarding(page)
    await createAccount(page, 'Commercial Bank', 50000)
    await page.getByRole('button', { name: 'Reconcile Commercial Bank' }).click()
    await expect(page.locator('text=Reconcile Commercial Bank')).toBeVisible()
    await page.fill('input[placeholder="0.00"]', '50000')
    await page.getByRole('button', { name: 'Mark Reconciled' }).click()
    await expect(page.locator('text=Reconciled today')).toBeVisible()
  })
})
