declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
  }
}

export function trackPageView(path: string, title?: string) {
  if (window.gtag) {
    window.gtag('event', 'page_view', {
      page_path: path,
      page_title: title ?? document.title,
    })
  }
}

export function trackAudioPlay(imamName: string, mosqueName: string) {
  if (window.gtag) {
    window.gtag('event', 'audio_play', {
      imam_name: imamName,
      mosque_name: mosqueName,
    })
  }
}

export function trackFavorite(action: 'add' | 'remove', mosqueId: number, mosqueName: string) {
  if (window.gtag) {
    window.gtag('event', 'favorite_toggle', {
      action,
      mosque_id: mosqueId,
      mosque_name: mosqueName,
    })
  }
}

export function trackFilter(filterType: 'area' | 'location', value: string) {
  if (window.gtag) {
    window.gtag('event', 'filter_used', {
      filter_type: filterType,
      filter_value: value,
    })
  }
}

export function trackSearch(query: string, resultCount: number) {
  if (window.gtag) {
    window.gtag('event', 'search', {
      search_term: query,
      result_count: resultCount,
    })
  }
}

export function trackProximitySort() {
  if (window.gtag) {
    window.gtag('event', 'proximity_sort')
  }
}

export function trackMapClick(mosqueName: string) {
  if (window.gtag) {
    window.gtag('event', 'map_click', {
      mosque_name: mosqueName,
    })
  }
}

export function trackLogin(method: 'google' | 'phone') {
  if (window.gtag) {
    window.gtag('event', 'login', { method })
  }
}

export function trackRequestSubmit(requestType: string) {
  if (window.gtag) {
    window.gtag('event', 'request_submit', {
      request_type: requestType,
    })
  }
}
