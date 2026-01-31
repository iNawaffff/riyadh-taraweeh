import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { NotFoundPage } from '@/pages/NotFoundPage'

describe('NotFoundPage', () => {
  it('renders 404 text', () => {
    render(
      <BrowserRouter>
        <NotFoundPage />
      </BrowserRouter>
    )

    expect(screen.getByText('404')).toBeInTheDocument()
  })

  it('renders Arabic error message', () => {
    render(
      <BrowserRouter>
        <NotFoundPage />
      </BrowserRouter>
    )

    expect(screen.getByText('الصفحة غير موجودة')).toBeInTheDocument()
  })

  it('renders home link', () => {
    render(
      <BrowserRouter>
        <NotFoundPage />
      </BrowserRouter>
    )

    const homeLink = screen.getByRole('link', { name: /العودة للصفحة الرئيسية/i })
    expect(homeLink).toBeInTheDocument()
    expect(homeLink).toHaveAttribute('href', '/')
  })
})
