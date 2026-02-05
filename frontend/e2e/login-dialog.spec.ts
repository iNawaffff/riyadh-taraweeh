import { test, expect } from '@playwright/test'

test.describe('Login Dialog', () => {
  test('opens and shows auth options', async ({ page }) => {
    await page.goto('/')

    // Click the login/user button in the header
    const loginButton = page.locator('header').getByRole('button').filter({ hasText: /دخول|تسجيل/ })
    await loginButton.click()

    // Verify Google sign-in option is visible
    await expect(page.getByText('المتابعة بحساب Google')).toBeVisible()

    // Verify phone sign-in option is visible
    await expect(page.getByText('المتابعة برقم الجوال')).toBeVisible()
  })

  test('navigates to phone input mode', async ({ page }) => {
    await page.goto('/')

    const loginButton = page.locator('header').getByRole('button').filter({ hasText: /دخول|تسجيل/ })
    await loginButton.click()

    // Click phone sign-in
    await page.getByText('المتابعة برقم الجوال').click()

    // Verify phone input is visible
    await expect(page.getByPlaceholder('5XX XXX XXXX')).toBeVisible()

    // Verify country code badge
    await expect(page.getByText('966+')).toBeVisible()

    // Verify send OTP button exists
    await expect(page.getByText('إرسال رمز التحقق')).toBeVisible()
  })

  test('validates Saudi phone number format', async ({ page }) => {
    await page.goto('/')

    const loginButton = page.locator('header').getByRole('button').filter({ hasText: /دخول|تسجيل/ })
    await loginButton.click()
    await page.getByText('المتابعة برقم الجوال').click()

    const phoneInput = page.getByPlaceholder('5XX XXX XXXX')
    const sendButton = page.getByRole('button', { name: 'إرسال رمز التحقق' })

    // Empty input — button should be disabled
    await expect(sendButton).toBeDisabled()

    // Type an invalid short number
    await phoneInput.fill('512')
    await expect(sendButton).toBeDisabled()

    // Type a valid 9-digit number starting with 5
    await phoneInput.fill('512345678')
    await expect(sendButton).toBeEnabled()
  })
})
