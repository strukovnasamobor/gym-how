import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../firebase";

// Spremi korisnika u Firestore (samo prvi put). Ako dokument već postoji, ne dira ga.
// Shared by the Google sign-in cascade (first login) and the email-register flow.
export async function saveUserToFirestore(firebaseUser, extraData = {}) {
  const docRef = doc(db, "users", firebaseUser.uid);
  const existing = await getDoc(docRef);
  if (!existing.exists()) {
    await setDoc(docRef, {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName || extraData.displayName || "",
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL || "",
      birthDate: extraData.birthDate || "",
      favorite: [],
      createdAt: new Date().toISOString(),
    });
  }
}
