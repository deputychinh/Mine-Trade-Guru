import { expect, test, type Page } from '@playwright/test'

// Smoke tests for the main user journeys against the live simulator.

async function openBoard(page: Page, path = '/'): Promise<void> {
  await page.addInitScript(() => window.localStorage.setItem('mtg.settings.v1', JSON.stringify({ locale: 'en' })))
  await page.goto(path)
  await expect(page.locator('.price-board-row').first()).toBeVisible()
}

test('shows a live board with VN colors and connection status', async ({ page }) => {
  await openBoard(page)
  await expect(page).toHaveURL(/\/board\/vn30$/)
  await expect(page.getByRole('status').filter({ hasText: 'Live' })).toBeVisible()
  await expect(page.locator('.price-board-row .text-market-reference').first()).toBeVisible()

  // Prices keep moving: the matched-volume column of some row changes within a few seconds.
  const before = await page.locator('.price-board-row').allInnerTexts()
  await expect.poll(async () => (await page.locator('.price-board-row').allInnerTexts()).join() !== before.join(), { timeout: 10_000 }).toBe(true)
})

test('switching boards updates the address bar', async ({ page }) => {
  await openBoard(page)
  await page.getByRole('tab', { name: 'HOSE' }).click()
  await expect(page).toHaveURL(/\/board\/hose$/)
  await page.reload()
  await expect(page.getByRole('tab', { name: 'HOSE' })).toHaveAttribute('aria-selected', 'true')
})

test('opens the symbol detail from the board and closes it with Escape', async ({ page }) => {
  await openBoard(page)
  await page.locator('.price-board-row').first().click()
  const drawer = page.locator('.symbol-detail')
  await expect(drawer.getByText('Order book')).toBeVisible()
  await expect(drawer.getByText('Key stats')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(drawer.getByText('Order book')).toBeHidden()
})

test('finds a symbol with the / shortcut', async ({ page }) => {
  await openBoard(page)
  await page.locator('body').click({ position: { x: 5, y: 300 } })
  await page.keyboard.press('/')
  await page.keyboard.type('FPT')
  await page.getByRole('option', { name: /FPT/ }).first().click()
  await expect(page.locator('.symbol-header').getByText('FPT', { exact: true })).toBeVisible()
})

test('adds a symbol to the watchlist from the board', async ({ page }) => {
  await openBoard(page)
  const watchlistTab = page.getByRole('tab', { name: /Watchlist/ })
  const countBefore = Number((await watchlistTab.innerText()).replace(/\D/g, ''))
  await page.locator('.price-board-row').filter({ hasNotText: 'FPT' }).getByRole('button', { name: /Add .* to watchlist/ }).first().click()
  await expect(watchlistTab).toContainText(String(countBefore + 1))
})
