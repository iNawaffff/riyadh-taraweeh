import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FavoritesFilterButton } from '@/components/search/FavoritesFilterButton'

describe('FavoritesFilterButton', () => {
  it('renders with count', () => {
    render(
      <FavoritesFilterButton
        onClick={() => {}}
        count={5}
      />
    )

    expect(screen.getByText('المفضلة')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('is disabled when count is 0', () => {
    render(
      <FavoritesFilterButton
        onClick={() => {}}
        count={0}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(
      <FavoritesFilterButton
        onClick={handleClick}
        count={3}
      />
    )

    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('shows active state', () => {
    render(
      <FavoritesFilterButton
        onClick={() => {}}
        count={3}
        isActive={true}
      />
    )

    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
  })
})
