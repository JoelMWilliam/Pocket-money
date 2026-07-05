import { test, expect } from '@playwright/test'

test('debug initial page', async ({ page }) => {
  page.on('console', (msg) => console.log('CONSOLE:', msg.type(), msg.text()))
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message, err.stack))
  await page.goto('/')
  await page.evaluate(() => {
    localStorage.clear()
    try { indexedDB.deleteDatabase('pocket-money-db') } catch (e) {}
  })
  await page.reload()
  await page.waitForTimeout(3000)
  const html = await page.content()
  console.log(html.slice(0, 2000))
  await page.screenshot({ path: 'tests/e2e/debug.png' })
})
