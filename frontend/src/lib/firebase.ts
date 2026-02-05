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

export async function sendPhoneOtp(
  phoneNumber: string,
  elementId: string
): Promise<ConfirmationResult> {
  const authModule = await loadAuthModule()
  const authInstance = await getAuth()

  // Clear previous verifier
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch { /* ignore */ }
    recaptchaVerifier = null
  }
  const container = document.getElementById(elementId)
  if (container) container.innerHTML = ''

  recaptchaVerifier = new authModule.RecaptchaVerifier(authInstance, elementId, { size: 'invisible' })
  try {
    return await withTimeout(
      authModule.signInWithPhoneNumber(authInstance, phoneNumber, recaptchaVerifier),
      15000,
      'تعذر التحقق، تأكد من اتصالك بالإنترنت'
    )
  } catch (error) {
    resetRecaptcha()
    throw error
  }
}

export function resetRecaptcha() {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch { /* ignore */ }
    recaptchaVerifier = null
  }
  const container = document.getElementById('recaptcha-container')
  if (container) container.innerHTML = ''
}

export async function firebaseSignOut() {
  const authInstance = await getAuth()
  return authInstance.signOut()
}
