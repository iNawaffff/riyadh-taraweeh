import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Component that scrolls to top when navigating to a new page
 */
export function ScrollRestoration() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    })
  }, [pathname])

  return null
}
