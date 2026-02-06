import { initializeApp, type FirebaseApp } from 'firebase/app'
import type { Auth, ConfirmationResult } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _authModulePromise: Promise<typeof import('firebase/auth')> | null = null

function getApp(): FirebaseApp {
  if (!_app) {
    _app = initializeApp(firebaseConfig)
  }
  return _app
}

function loadAuthModule() {
  if (!_authModulePromise) {
    _authModulePromise = import('firebase/auth')
  }
  return _authModulePromise
}

export async function getAuth(): Promise<Auth> {
  if (_auth) return _auth
  const authModule = await loadAuthModule()
  const app = getApp()
  _auth = authModule.getAuth(app)
  await authModule.setPersistence(_auth, authModule.browserLocalPersistence)
  _auth.languageCode = 'ar'
  return _auth
}

// Synchronous access (only valid after getAuth() has resolved)
export function getAuthSync(): Auth | null {
  return _auth
}

export async function onAuthStateChanged(
  callback: (user: import('firebase/auth').User | null) => void
): Promise<() => void> {
  const authModule = await loadAuthModule()
  const authInstance = await getAuth()
  return authModule.onAuthStateChanged(authInstance, callback)
}

export async function signInWithGoogle() {
  const authModule = await loadAuthModule()
  const authInstance = await getAuth()
  const provider = new authModule.GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  return authModule.signInWithPopup(authInstance, provider)
}

// Timeout helper for operations that may hang (e.g., reCAPTCHA behind ad blockers)
function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ])
}

// Phone sign-in
let recaptchaVerifier: import('firebase/auth').RecaptchaVerifier | null = null

/**
 * Fully reset reCAPTCHA state - clears verifier, widget, and recreates the container element.
 * This is more aggressive than just calling clear() because Firebase can leave internal state.
 */
export function resetRecaptcha() {
  // Clear the verifier object
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch { /* ignore */ }
    recaptchaVerifier = null
  }

  // Completely recreate the container element to clear any residual reCAPTCHA DOM state
  const container = document.getElementById('recaptcha-container')
  if (container) {
    const parent = container.parentElement
    if (parent) {
      const newContainer = document.createElement('div')
      newContainer.id = 'recaptcha-container'
      parent.replaceChild(newContainer, container)
    } else {
      container.innerHTML = ''
    }
  }

  // Also clear any reCAPTCHA iframes that might have been injected elsewhere
  document.querySelectorAll('iframe[src*="recaptcha"]').forEach(el => {
    try { el.remove() } catch { /* ignore */ }
  })
}

export async function sendPhoneOtp(
  phoneNumber: string,
  elementId: string
): Promise<ConfirmationResult> {
  const authModule = await loadAuthModule()
  const authInstance = await getAuth()

  // Always do a full reset before creating a new verifier
  resetRecaptcha()

  // Small delay to ensure DOM is settled after reset
  await new Promise(resolve => setTimeout(resolve, 100))

  const container = document.getElementById(elementId)
  if (!container) {
    throw new Error('reCAPTCHA container not found')
  }

  recaptchaVerifier = new authModule.RecaptchaVerifier(authInstance, elementId, {
    size: 'invisible',
    callback: () => {
      // reCAPTCHA solved - will proceed with signInWithPhoneNumber
    },
    'expired-callback': () => {
      // reCAPTCHA expired - reset for next attempt
      resetRecaptcha()
    },
  })

  try {
    // Render the reCAPTCHA widget explicitly to catch render errors early
    await recaptchaVerifier.render()

    return await withTimeout(
      authModule.signInWithPhoneNumber(authInstance, phoneNumber, recaptchaVerifier),
      15000,
      'تعذر التحقق، تأكد من اتصالك بالإنترنت'
    )
  } catch (error) {
    // Always reset on any error to allow clean retry
    resetRecaptcha()
    throw error
  }
}

export async function firebaseSignOut() {
  const authInstance = await getAuth()
  return authInstance.signOut()
}
