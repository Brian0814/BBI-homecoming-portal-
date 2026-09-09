import { auth } from "./firebase";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from "firebase/auth";

export const SCOPES = [
  "https://www.googleapis.com/auth/gmail.send"
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({
  prompt: "consent",
  access_type: "offline"
});

// Cache the access token and user in memory (per security guidelines)
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;
let isSigningIn = false;

type AuthCallback = (user: User | null, token: string | null) => void;
const listeners: Set<AuthCallback> = new Set();

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener(cachedUser, cachedAccessToken);
    } catch (e) {
      console.error("Auth listener error:", e);
    }
  });
}

/**
 * Initialize auth state listener. Call this on app/modal load.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
    cachedUser = user;
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // We have a firebase user, but need the Gmail scope access token
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
    notifyListeners();
  });

  return unsubscribe;
};

/**
 * Subscribe to auth and token state changes
 */
export const subscribeAuth = (callback: AuthCallback) => {
  listeners.add(callback);
  // Immediately notify with current state
  callback(cachedUser, cachedAccessToken);
  return () => {
    listeners.delete(callback);
  };
};

/**
 * Initiates the Google sign-in popup to grant Gmail sending permission
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Google Sign-In completed, but no Gmail access token was returned.");
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    notifyListeners();
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Google Sign-In error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

/**
 * Returns the currently active cached in-memory access token, or null
 */
export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

/**
 * Returns the current authenticated user, or null
 */
export const getCurrentUser = (): User | null => {
  return cachedUser || auth.currentUser;
};

/**
 * Logs out and clears the in-memory access token
 */
export const logout = async () => {
  try {
    await auth.signOut();
  } catch (e) {
    console.warn("Sign out error:", e);
  } finally {
    cachedAccessToken = null;
    cachedUser = null;
    notifyListeners();
  }
};
