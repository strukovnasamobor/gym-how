import { createContext, useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

export const AppContext = createContext();

export function AppContextProvider({ children }) {
  const [user, setUser] = useState(null); // Firebase Auth user
  const [userProfile, setUserProfile] = useState(null); // Firestore profil
  const [authLoading, setAuthLoading] = useState(true);

  const [exercises, setExercisesState] = useState([]);
  const [exerciseSortOrder, setExerciseSortOrder] = useState(() => {
    return localStorage.getItem("exerciseSortOrder") || "az";
  });

  const [favorites, setFavorites] = useState(() => {
    const storedFavorite = localStorage.getItem("favorites");
    if (!storedFavorite) return [];

    const parsed = JSON.parse(storedFavorite);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  });

  useEffect(() => {
    localStorage.setItem("favorites", JSON.stringify(favorites));
  }, [favorites]);

  const persistFavoritesToFirestore = async (
    nextFavorites,
    targetUser = user,
  ) => {
    if (!targetUser) return;

    try {
      const userRef = doc(db, "users", targetUser.uid);
      await setDoc(userRef, { favorite: nextFavorites }, { merge: true });
    } catch (error) {
      console.error("Failed to sync favorites to Firestore:", error);
    }
  };

  const toggleFavorite = (exerciseID) => {
    const normalizedExerciseID = String(exerciseID);

    setFavorites((previous) => {
      const nextFavorites = previous.includes(normalizedExerciseID)
        ? previous.filter((id) => id !== normalizedExerciseID)
        : [...previous, normalizedExerciseID];

      persistFavoritesToFirestore(nextFavorites);
      return nextFavorites;
    });
  };

  const [isDarkModeStored] = useState(() => {
    return localStorage.getItem("isDarkMode");
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem("isDarkMode");
    return stored === null
      ? window.matchMedia("(prefers-color-scheme: light)").matches
      : stored === "true";
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem("exerciseSortOrder", exerciseSortOrder);
  }, [exerciseSortOrder]);

  // Slušaj Firebase Auth promjene
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setUser(firebaseUser);
        if (firebaseUser) {
          // Dohvati Firestore profil, ali ne blokiraj Auth ako je pristup odbijen.
          const docRef = doc(db, "users", firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const profileData = docSnap.data();
            setUserProfile(profileData);

            if (Array.isArray(profileData.favorite)) {
              setFavorites(profileData.favorite.map((id) => String(id)));
            } else {
              const localFavorites = JSON.parse(
                localStorage.getItem("favorites") || "[]",
              );
              setFavorites(
                Array.isArray(localFavorites)
                  ? localFavorites.map((id) => String(id))
                  : [],
              );
            }
          } else {
            setUserProfile(null);
            setFavorites([]);
          }
        } else {
          setUserProfile(null);
          const localFavorites = JSON.parse(
            localStorage.getItem("favorites") || "[]",
          );
          setFavorites(
            Array.isArray(localFavorites)
              ? localFavorites.map((id) => String(id))
              : [],
          );
        }
      } catch (error) {
        console.error("Auth profile load failed:", error);
        if (firebaseUser) {
          setUserProfile(null);
          setFavorites([]);
        }
      } finally {
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Osvježi profil iz Firestorea (poziva se nakon promjena)
  const refreshUserProfile = async () => {
    if (auth.currentUser) {
      try {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserProfile(docSnap.data());
        }
      } catch (error) {
        console.error("Profile refresh failed:", error);
      }
    }
  };

  const setExercises = (nextExercises) => {
    if (typeof nextExercises === "function") {
      setExercisesState((previousExercises) => {
        const computedValue = nextExercises(previousExercises);
        return Array.isArray(computedValue) ? computedValue : [];
      });
      return;
    }

    setExercisesState(Array.isArray(nextExercises) ? nextExercises : []);
  };

  return (
    <AppContext.Provider
      value={{
        isDarkMode,
        setIsDarkMode,
        user,
        userProfile,
        authLoading,
        refreshUserProfile,
        favorites,
        toggleFavorite,
        exercises,
        setExercises,
        exerciseSortOrder,
        setExerciseSortOrder,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
