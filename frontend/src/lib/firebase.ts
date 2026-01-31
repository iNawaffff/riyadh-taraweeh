import { initializeApp } from 'firebase/app'
import {
  getAuth,
  browserLocalPersistence,
  setPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  type ConfirmationResult,
  type Auth,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)
export const auth: Auth = getAuth(app)

// Persist auth state across browser restarts
setPersistence(auth, browserLocalPersistence)

// Set Arabic locale for SMS messages and reCAPTCHA
auth.languageCode = 'ar'

// Google sign-in
const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider)
}

// Phone sign-in — singleton reCAPTCHA
let recaptchaVerifier: RecaptchaVerifier | null = null

function getOrCreateRecaptcha(elementId: string): RecaptchaVerifier {
  // Always clear previous verifier to avoid stale state
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch { /* ignore */ }
    recaptchaVerifier = null
  }
  // Clear any leftover reCAPTCHA iframes/badges from the container
  const container = document.getElementById(elementId)
  if (container) container.innerHTML = ''

  recaptchaVerifier = new RecaptchaVerifier(auth, elementId, { size: 'invisible' })
  return recaptchaVerifier
}

export function resetRecaptcha() {
  if (recaptchaVerifier) {
    try { recaptchaVerifier.clear() } catch { /* ignore */ }
    recaptchaVerifier = null
  }
  // Clean up any leftover reCAPTCHA DOM elements
  const container = document.getElementById('recaptcha-container')
  if (container) container.innerHTML = ''
}

export async function sendPhoneOtp(
  phoneNumber: string,
  elementId: string
): Promise<ConfirmationResult> {
  const verifier = getOrCreateRecaptcha(elementId)
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, verifier)
  } catch (error) {
    resetRecaptcha()
    throw error
  }
}

export async function firebaseSignOut() {
  return auth.signOut()
}
