import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import { auth, googleProvider, GOOGLE_CLIENT_ID } from "../../firebase";
import { promptOneTap, disableOneTapAutoSelect } from "./googleOneTap";
import { saveUserToFirestore } from "./userDoc";

// One Tap rejections that mean "we couldn't even try" (embedded WebView, no GSI
// script, or a recent dismissal still in cooldown) — as opposed to the user
// actively dismissing the prompt (one-tap-no-credential / -timeout / -superseded).
// Both buckets currently fall through to the popup; the distinction is kept so a
// future iteration can suppress the popup on an explicit dismissal.
const UNAVAILABLE_ERRORS = new Set([
  "one-tap-webview",
  "one-tap-recent-failure",
  "one-tap-no-script",
]);

// Exchange a Google ID token for a Firebase session. Shared by the native
// account-picker path and the web One Tap path.
async function exchangeGoogleIdToken(idToken) {
  const cred = GoogleAuthProvider.credential(idToken);
  try {
    const result = await signInWithCredential(auth, cred);
    return result.user;
  } catch (err) {
    if (err?.code === "auth/invalid-credential") {
      console.warn(
        "auth/invalid-credential: the Firebase Console's Google provider isn't bound " +
          "to the same Web Client ID that issued this token (" +
          GOOGLE_CLIENT_ID +
          ").",
      );
    }
    throw err;
  }
}

// Drives the full sign-in cascade. Resolves with the Firebase user on success,
// or null when the user quietly dismissed (One Tap dismissal or closed popup) so
// the caller can stop without surfacing an error.
export async function signInWithGoogle() {
  // 1. Native (Capacitor): Google Play Services account picker. With
  //    skipNativeAuth: true the plugin only returns a credential — we sign the
  //    JS SDK in below so onAuthStateChanged stays the single source of truth.
  if (Capacitor.isNativePlatform()) {
    const result = await FirebaseAuthentication.signInWithGoogle();
    const idToken = result?.credential?.idToken;
    if (!idToken) throw new Error("native-google-no-token");
    const user = await exchangeGoogleIdToken(idToken);
    await saveUserToFirestore(user);
    return user;
  }

  // 2. Web: One Tap. A success path is a single tap with no popup window at all.
  let idToken = null;
  try {
    idToken = await promptOneTap(GOOGLE_CLIENT_ID);
  } catch (err) {
    // Couldn't even try vs. user dismissed — both fall through to the popup.
    const reason = UNAVAILABLE_ERRORS.has(err?.message)
      ? "unavailable"
      : "dismissed";
    void reason;
    idToken = null;
  }

  if (idToken) {
    const user = await exchangeGoogleIdToken(idToken);
    await saveUserToFirestore(user);
    return user;
  }

  // 3. Popup fallback. Invisible on the One Tap failure paths.
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await saveUserToFirestore(result.user);
    return result.user;
  } catch (err) {
    if (
      err?.code === "auth/popup-closed-by-user" ||
      err?.code === "auth/cancelled-popup-request"
    ) {
      return null;
    }
    throw err;
  }
}

// Sign out across every surface. Clears One Tap auto-select (and the failure
// cooldown) so account-switching works, signs out the native plugin if present,
// then signs out the Firebase JS SDK.
export async function signOutGoogle() {
  disableOneTapAutoSelect();
  if (Capacitor.isNativePlatform()) {
    try {
      await FirebaseAuthentication.signOut();
    } catch {
      /* native plugin unavailable or already signed out */
    }
  }
  await signOut(auth);
}
