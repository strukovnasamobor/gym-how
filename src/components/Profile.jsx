import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Typography,
  Box,
  Avatar,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "../../firebase";
import { saveUserToFirestore } from "../lib/userDoc";
import { AppContext } from "../AppContext";
import { useTranslation } from "react-i18next";
import {
  EXERCISES_CACHE_KEY,
  fetchAllExercises,
  findExerciseById,
  readCachedJson,
  writeCachedJson,
} from "../utils/fetchData";
import ExerciseImage from "./ExerciseImage";
import WorkoutPlanner from "../pages/WorkoutPlanner";
const placeholder = "/images/placeholder.png";
import { useLocation, useNavigate } from "react-router-dom";
import GoogleIcon from "@mui/icons-material/Google";
import LogoutIcon from "@mui/icons-material/Logout";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

//Auth Modal
const AuthModal = ({ onClose }) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const { refreshUserProfile, signInWithGoogle, isDarkMode } =
    useContext(AppContext);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      // Runs the cascade (native picker -> One Tap -> popup). Firestore doc
      // creation + profile refresh happen inside the cascade; a null return
      // means the user quietly dismissed, so we stop without an error.
      const signedInUser = await signInWithGoogle();
      if (signedInUser) onClose();
    } catch (err) {
      setError(t("profile.auth.errors.googleLoginFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      if (!result.user.emailVerified) {
        try {
          await sendEmailVerification(result.user);
        } catch (verificationErr) {
          console.log(
            "Resend verification error:",
            verificationErr.code,
            verificationErr.message,
          );
        }
        await signOut(auth);
        setError(t("profile.auth.errors.emailNotVerified"));
        setInfo(t("profile.auth.verificationSentOnRegister"));
        return;
      }
      await refreshUserProfile();
      onClose();
    } catch (err) {
      setError(t("profile.auth.errors.invalidEmailOrPassword"));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!displayName.trim()) {
      setError(t("profile.auth.errors.enterUsername"));
      return;
    }
    if (password.length < 6) {
      setError(t("profile.auth.errors.passwordMinLength"));
      return;
    }
    setLoading(true);
    setError("");
    setInfo("");
    try {
      const result = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      await updateProfile(result.user, { displayName });
      if (!result.user.emailVerified) {
        await sendEmailVerification(result.user);
      }
      await saveUserToFirestore(result.user, { displayName, birthDate });
      await signOut(auth);
      setMode("login");
      setPassword("");
      setInfo(t("profile.auth.verificationSentOnRegister"));
    } catch (err) {
      console.log("Register error:", err.code, err.message);
      if (err.code === "auth/email-already-in-use") {
        setError(t("profile.auth.errors.emailAlreadyInUse"));
      } else {
        setError(t("profile.auth.errors.registerFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(t("profile.auth.errors.enterEmailForReset"));
      setInfo("");
      return;
    }

    setLoading(true);
    setError("");
    setInfo("");
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setInfo(t("profile.auth.resetEmailSent"));
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        setError(t("profile.auth.errors.userNotFound"));
      } else if (err.code === "auth/invalid-email") {
        setError(t("profile.auth.errors.invalidEmail"));
      } else {
        setError(t("profile.auth.errors.resetPasswordFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1.5px solid #e0e0e0",
    fontSize: "15px",
    outline: "none",
    fontFamily: "Josefin Sans, sans-serif",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    color: "#111",
    colorScheme: "light",
  };

  const btnPrimary = {
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#5ebb4c",
    color: "#fff",
    fontSize: "16px",
    fontWeight: 700,
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "Josefin Sans, sans-serif",
    opacity: loading ? 0.7 : 1,
  };

  const btnGoogle = {
    width: "100%",
    padding: "13px",
    borderRadius: "12px",
    border: isDarkMode ? "1.5px solid #3a3a3a" : "1.5px solid #e0e0e0",
    backgroundColor: isDarkMode ? "#1a1a1a" : "#fff",
    color: isDarkMode ? "#f5f5f5" : "#353535",
    fontSize: "15px",
    fontWeight: 600,
    cursor: loading ? "not-allowed" : "pointer",
    fontFamily: "Josefin Sans, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
  };

  return (
    // Overlay
    <Box
      onClick={onClose}
      sx={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      {/* Modal panel */}
      <Box
        onClick={(e) => e.stopPropagation()}
        className="light-surface"
        sx={{
          width: "min(100%, 480px)",
          maxWidth: "480px",
          backgroundColor: "#fff",
          borderRadius: "24px",
          padding: "32px 24px 40px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={3}
        >
          <Typography sx={{ fontSize: "22px", fontWeight: 800 }}>
            {mode === "login"
              ? t("profile.auth.loginTitle")
              : t("profile.auth.registerTitle")}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>

        {/* Google gumb */}
        <button
          style={btnGoogle}
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          <GoogleIcon sx={{ fontSize: "20px", color: "#EA4335" }} />
          {t("profile.auth.continueWithGoogle")}
        </button>

        {/* Separator */}
        <Stack direction="row" alignItems="center" spacing={1} sx={{ my: 2.5 }}>
          <Divider sx={{ flex: 1 }} />
          <Typography sx={{ color: "#aaa", fontSize: "13px" }}>
            {t("profile.auth.or")}
          </Typography>
          <Divider sx={{ flex: 1 }} />
        </Stack>

        {/* Forma */}
        <Stack spacing={1.5}>
          {mode === "register" && (
            <input
              style={inputStyle}
              placeholder={t("profile.auth.username")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}

          <input
            style={inputStyle}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Lozinka s eye ikonom */}
          <Box sx={{ position: "relative" }}>
            <input
              style={{ ...inputStyle, paddingRight: "48px" }}
              type={showPassword ? "text" : "password"}
              placeholder={t("profile.auth.password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  mode === "login" ? handleEmailLogin() : handleRegister();
                }
              }}
            />
            <IconButton
              onClick={() => setShowPassword((p) => !p)}
              sx={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
              }}
              size="small"
            >
              {showPassword ? (
                <VisibilityOffIcon fontSize="small" />
              ) : (
                <VisibilityIcon fontSize="small" />
              )}
            </IconButton>
          </Box>

          {mode === "register" && (
            <Box>
              <Typography
                sx={{ fontSize: "12px", color: "#888", mb: 0.5, ml: 0.5 }}
              >
                {t("profile.birthDate")}
              </Typography>
              <input
                style={inputStyle}
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </Box>
          )}

          {error && (
            <Typography
              sx={{ color: "#e53935", fontSize: "13px", textAlign: "center" }}
            >
              {error}
            </Typography>
          )}

          {info && (
            <Typography
              sx={{ color: "#2e7d32", fontSize: "13px", textAlign: "center" }}
            >
              {info}
            </Typography>
          )}

          {mode === "login" && (
            <Typography
              onClick={handleForgotPassword}
              sx={{
                textAlign: "right",
                fontSize: "13px",
                color: "#5ebb4c",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {t("profile.auth.forgotPassword")}
            </Typography>
          )}

          <button
            style={btnPrimary}
            onClick={mode === "login" ? handleEmailLogin : handleRegister}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={20} sx={{ color: "#fff" }} />
            ) : mode === "login" ? (
              t("profile.auth.login")
            ) : (
              t("profile.auth.createAccount")
            )}
          </button>
        </Stack>

        {/* Prebaci mode */}
        <Typography
          sx={{ textAlign: "center", mt: 2.5, fontSize: "14px", color: "#666" }}
        >
          {mode === "login"
            ? t("profile.auth.noAccount")
            : t("profile.auth.alreadyHaveAccount")}
          <span
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
              setInfo("");
            }}
            style={{ color: "#5ebb4c", fontWeight: 700, cursor: "pointer" }}
          >
            {mode === "login"
              ? t("profile.auth.register")
              : t("profile.auth.login")}
          </span>
        </Typography>
      </Box>
    </Box>
  );
};

const EditProfileModal = ({ onClose, user, userProfile }) => {
  const { t } = useTranslation();
  const { refreshUserProfile, isDarkMode } = useContext(AppContext);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [displayName, setDisplayName] = useState(
    userProfile?.displayName || user?.displayName || "",
  );
  const [photoURL, setPhotoURL] = useState(
    userProfile?.photoURL || user?.photoURL || "",
  );
  const [selectedPhotoFile, setSelectedPhotoFile] = useState(null);
  const [photoPreviewURL, setPhotoPreviewURL] = useState("");
  const [birthDate, setBirthDate] = useState(userProfile?.birthDate || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const compressImageToDataURL = (file) => {
    const steps = [
      { maxDimension: 768, quality: 0.62 },
      { maxDimension: 512, quality: 0.52 },
      { maxDimension: 384, quality: 0.45 },
    ];
    const MAX_DATA_URL_LENGTH = 180000;

    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      const renderStep = (stepIndex) => {
        const { maxDimension, quality } = steps[stepIndex];
        const canvas = document.createElement("canvas");
        const scale = Math.min(
          1,
          maxDimension / image.width,
          maxDimension / image.height,
        );

        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          throw new Error("canvas-context-unavailable");
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL("image/jpeg", quality);
      };

      image.onload = () => {
        try {
          let dataURL = "";

          for (let index = 0; index < steps.length; index += 1) {
            dataURL = renderStep(index);
            if (dataURL.length <= MAX_DATA_URL_LENGTH) {
              break;
            }
          }

          if (!dataURL || dataURL.length < 100) {
            reject(new Error("image-compression-failed"));
            return;
          }

          if (dataURL.length > MAX_DATA_URL_LENGTH) {
            reject(new Error("image-too-large-after-compression"));
            return;
          }

          resolve(dataURL);
        } catch (error) {
          reject(error);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("image-load-failed"));
      };

      image.src = objectUrl;
    });
  };

  useEffect(() => {
    return () => {
      if (photoPreviewURL) {
        URL.revokeObjectURL(photoPreviewURL);
      }
    };
  }, [photoPreviewURL]);

  const handleSelectedImage = (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = "";

    if (!selectedFile) {
      return;
    }

    if (!selectedFile.type.startsWith("image/")) {
      setError(t("profile.edit.errors.onlyImage"));
      return;
    }

    const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
    if (selectedFile.size > MAX_IMAGE_SIZE_BYTES) {
      setError(t("profile.edit.errors.maxImageSize"));
      return;
    }

    if (photoPreviewURL) {
      URL.revokeObjectURL(photoPreviewURL);
    }

    setSelectedPhotoFile(selectedFile);
    setPhotoPreviewURL(URL.createObjectURL(selectedFile));
    setError("");
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "12px",
    border: "1.5px solid #e0e0e0",
    fontSize: "15px",
    outline: "none",
    fontFamily: "Josefin Sans, sans-serif",
    boxSizing: "border-box",
    backgroundColor: "#fff",
    color: "#111",
    colorScheme: "light",
  };

  const handleSave = async () => {
    const normalizedDisplayName = displayName.trim();
    const normalizedPhotoURL = photoURL.trim();

    if (!normalizedDisplayName) {
      setError(t("profile.auth.errors.enterUsername"));
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError(t("profile.edit.errors.userNotLoggedIn"));
        return;
      }

      let finalPhotoURL = normalizedPhotoURL;

      if (selectedPhotoFile) {
        finalPhotoURL = await compressImageToDataURL(selectedPhotoFile);
      }

      if (normalizedDisplayName !== (currentUser.displayName || "")) {
        await updateProfile(currentUser, {
          displayName: normalizedDisplayName,
        });
      }

      const userRef = doc(db, "users", currentUser.uid);
      await setDoc(
        userRef,
        {
          displayName: normalizedDisplayName,
          photoURL: finalPhotoURL,
          birthDate,
        },
        { merge: true },
      );

      setSelectedPhotoFile(null);
      if (photoPreviewURL) {
        URL.revokeObjectURL(photoPreviewURL);
      }
      setPhotoPreviewURL("");
      setPhotoURL(finalPhotoURL);
      refreshUserProfile().catch((refreshError) => {
        console.error("Profile refresh failed:", refreshError);
      });
      setSuccess(t("profile.edit.success"));
      setTimeout(() => onClose(), 650);
    } catch (err) {
      console.error("Profile save failed:", err);

      if (err?.code === "auth/requires-recent-login") {
        setError(t("profile.edit.errors.requiresRecentLogin"));
      } else if (err?.message === "image-load-failed") {
        setError(t("profile.edit.errors.imageLoadFailed"));
      } else if (err?.message === "canvas-context-unavailable") {
        setError(t("profile.edit.errors.canvasUnavailable"));
      } else if (err?.message === "image-compression-failed") {
        setError(t("profile.edit.errors.compressionFailed"));
      } else if (err?.message === "image-too-large-after-compression") {
        setError(t("profile.edit.errors.imageTooLargeAfterCompression"));
      } else {
        setError(t("profile.edit.errors.saveFailed"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      onClick={onClose}
      sx={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        zIndex: 2100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
    >
      <Box
        onClick={(e) => e.stopPropagation()}
        className="light-surface"
        sx={{
          width: "min(100%, 520px)",
          maxWidth: "520px",
          backgroundColor: "#fff",
          borderRadius: "24px",
          padding: "28px 20px 36px",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.18)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
        }}
      >
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          mb={2.5}
        >
          <Typography sx={{ fontSize: "22px", fontWeight: 800 }}>
            {t("profile.edit.title")}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>

        <Stack spacing={1.4}>
          <input
            style={inputStyle}
            placeholder={t("profile.auth.username")}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleSelectedImage}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleSelectedImage}
          />

          <Stack direction="row" spacing={1}>
            <button
              type="button"
              className="profile-photo-action profile-photo-action-camera"
              onClick={() => cameraInputRef.current?.click()}
            >
              {t("profile.edit.takePhoto")}
            </button>
            <button
              type="button"
              className="profile-photo-action profile-photo-action-gallery"
              onClick={() => galleryInputRef.current?.click()}
            >
              {t("profile.edit.galleryUpload")}
            </button>
          </Stack>

          {(photoPreviewURL || photoURL) && (
            <Stack direction="row" spacing={1.2} alignItems="center">
              <Avatar
                src={photoPreviewURL || photoURL}
                sx={{ width: 44, height: 44 }}
              />
              <Typography sx={{ fontSize: "12px", color: "#666" }}>
                {t("profile.edit.newPhotoSelected")}
              </Typography>
            </Stack>
          )}

          <Box>
            <Typography
              sx={{ fontSize: "12px", color: "#888", mb: 0.5, ml: 0.5 }}
            >
              {t("profile.birthDate")}
            </Typography>
            <input
              style={inputStyle}
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </Box>

          {error && (
            <Typography
              sx={{ color: "#e53935", fontSize: "13px", textAlign: "center" }}
            >
              {error}
            </Typography>
          )}

          {success && (
            <Typography
              sx={{
                color: isDarkMode ? "#88d488" : "#2e7d32",
                fontSize: "13px",
                textAlign: "center",
              }}
            >
              {success}
            </Typography>
          )}

          <button
            onClick={handleSave}
            disabled={loading}
            className="profile-save-button"
            style={{
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? t("profile.edit.saving") : t("profile.edit.saveChanges")}
          </button>
        </Stack>
      </Box>
    </Box>
  );
};

// ─── Main Profile Component ───────────────────────────────────────────────────
const Profile = () => {
  const {
    user,
    userProfile,
    authLoading,
    favorites,
    exercises,
    isDarkMode,
    logoutUser,
  } = useContext(AppContext);
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [favoriteExercises, setFavoriteExercises] = useState([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [unresolvedFavoritesCount, setUnresolvedFavoritesCount] = useState(0);
  const [favoritesPage, setFavoritesPage] = useState(1);
  const lastFetchByIdRef = useRef(new Map());

  const FAVORITE_FETCH_COOLDOWN_MS = 60000;
  const FAVORITES_PER_PAGE = 10;

  const safeExercises = useMemo(
    () => (Array.isArray(exercises) ? exercises : []),
    [exercises],
  );
  const safeFavorites = useMemo(
    () => (Array.isArray(favorites) ? favorites.map((id) => String(id)) : []),
    [favorites],
  );
  const favoriteCount = safeFavorites.length;
  const totalFavoritePages = Math.max(
    1,
    Math.ceil(favoriteExercises.length / FAVORITES_PER_PAGE),
  );
  const pagedFavoriteExercises = favoriteExercises.slice(
    (favoritesPage - 1) * FAVORITES_PER_PAGE,
    favoritesPage * FAVORITES_PER_PAGE,
  );

  useEffect(() => {
    setFavoritesPage(1);
  }, [favoriteExercises.length]);

  useEffect(() => {
    if (favoritesPage > totalFavoritePages) {
      setFavoritesPage(totalFavoritePages);
    }
  }, [favoritesPage, totalFavoritePages]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("edit") === "1") {
      setShowEditModal(true);
    }
  }, [location.search]);

  const closeEditModal = () => {
    setShowEditModal(false);

    const params = new URLSearchParams(location.search);
    if (params.get("edit") === "1") {
      params.delete("edit");
      const search = params.toString();
      navigate(
        {
          pathname: location.pathname,
          search: search ? `?${search}` : "",
        },
        { replace: true },
      );
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadFavoriteExercises = async () => {
      if (!user || safeFavorites.length === 0) {
        setFavoriteExercises([]);
        setLoadingFavorites(false);
        return;
      }

      try {
        const cachedMap = new Map();

        const cachedGlobalExercises = localStorage.getItem(EXERCISES_CACHE_KEY);
        if (cachedGlobalExercises) {
          const parsedGlobal = JSON.parse(cachedGlobalExercises);
          if (Array.isArray(parsedGlobal)) {
            parsedGlobal.forEach((exercise) => {
              if (exercise?.id) {
                cachedMap.set(String(exercise.id), exercise);
              }
            });
          }
        }

        Object.keys(localStorage).forEach((key) => {
          if (!key.startsWith("exercises_")) {
            return;
          }

          const cachedValue = localStorage.getItem(key);
          if (!cachedValue) {
            return;
          }

          const parsedValue = JSON.parse(cachedValue);
          if (!Array.isArray(parsedValue)) {
            return;
          }

          parsedValue.forEach((exercise) => {
            if (exercise?.id && !cachedMap.has(String(exercise.id))) {
              cachedMap.set(String(exercise.id), exercise);
            }
          });
        });

        const favoritesSet = new Set(safeFavorites);
        const localMatches = safeExercises
          .filter((exercise) => favoritesSet.has(String(exercise.id)))
          .concat(
            Array.from(cachedMap.values()).filter((exercise) =>
              favoritesSet.has(String(exercise.id)),
            ),
          );

        const localMap = new Map(
          localMatches.map((exercise) => [String(exercise.id), exercise]),
        );

        const missingIds = safeFavorites.filter((id) => !localMap.has(id));

        if (missingIds.length === 0) {
          const orderedLocalFavorites = safeFavorites
            .map((id) => localMap.get(id))
            .filter(Boolean);

          if (!isCancelled) {
            setFavoriteExercises(orderedLocalFavorites);
            setUnresolvedFavoritesCount(0);
            setLoadingFavorites(false);
          }
          return;
        }

        const now = Date.now();
        const idsToFetch = missingIds.filter((id) => {
          const lastFetchTime = lastFetchByIdRef.current.get(id) || 0;
          return now - lastFetchTime > FAVORITE_FETCH_COOLDOWN_MS;
        });

        if (idsToFetch.length === 0) {
          const orderedLocalFavorites = safeFavorites
            .map((id) => localMap.get(id))
            .filter(Boolean);

          const unresolvedIds = safeFavorites.filter((id) => !localMap.has(id));

          if (!isCancelled) {
            setFavoriteExercises(orderedLocalFavorites);
            setUnresolvedFavoritesCount(unresolvedIds.length);
            setLoadingFavorites(false);
          }
          return;
        }

        idsToFetch.forEach((id) => {
          lastFetchByIdRef.current.set(id, now);
        });
        setLoadingFavorites(true);

        const cachedAllExercises = readCachedJson(EXERCISES_CACHE_KEY, []);
        const allExercises =
          Array.isArray(cachedAllExercises) && cachedAllExercises.length > 0
            ? cachedAllExercises
            : await fetchAllExercises();

        if (Array.isArray(allExercises) && allExercises.length > 0) {
          writeCachedJson(EXERCISES_CACHE_KEY, allExercises);
        }

        const fetchedValid = idsToFetch
          .map((favoriteId) => findExerciseById(allExercises, favoriteId))
          .filter((exercise) => exercise && exercise.id);

        const combinedMap = new Map(localMap);
        fetchedValid.forEach((exercise) => {
          combinedMap.set(String(exercise.id), exercise);
        });

        const orderedFavorites = safeFavorites
          .map((id) => combinedMap.get(id))
          .filter(Boolean);
        const unresolvedIds = safeFavorites.filter(
          (id) => !combinedMap.has(id),
        );

        if (!isCancelled) {
          setFavoriteExercises(orderedFavorites);
          setUnresolvedFavoritesCount(unresolvedIds.length);
        }
      } finally {
        if (!isCancelled) {
          setLoadingFavorites(false);
        }
      }
    };

    loadFavoriteExercises();

    return () => {
      isCancelled = true;
    };
  }, [user, safeFavorites, safeExercises]);

  const handleLogout = async () => {
    setLogoutDialogOpen(false);
    // Full sign-out: clears One Tap auto-select + cooldown (so account-switching
    // works), signs out the native plugin, then the Firebase JS SDK.
    await logoutUser();
  };

  const handleDeleteAccountClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteDialogOpen(false);
    await handleDeleteAccountConfirmed();
  };

  const handleDeleteAccountConfirmed = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setDeleteError(t("profile.delete.errors.userNotLoggedIn"));
      return;
    }

    setDeletingAccount(true);
    setDeleteError("");

    try {
      const providerIds = new Set(
        (currentUser.providerData || [])
          .map((provider) => provider.providerId)
          .filter(Boolean),
      );

      if (providerIds.has("google.com")) {
        await reauthenticateWithPopup(currentUser, googleProvider);
      } else if (providerIds.has("password")) {
        const password = window.prompt(t("profile.delete.passwordPrompt"));
        if (!password) {
          return;
        }

        const email = currentUser.email;
        if (!email) {
          setDeleteError(t("profile.delete.errors.reauthFailed"));
          return;
        }

        const credential = EmailAuthProvider.credential(email, password);
        await reauthenticateWithCredential(currentUser, credential);
      }

      localStorage.removeItem("favorites");

      // Remove ALL of the user's Firestore data before deleting the auth account
      // (both deletes run while still authenticated, satisfying the owner-only rules).
      await deleteDoc(doc(db, "users", currentUser.uid));
      await deleteDoc(doc(db, "workoutPlans", currentUser.uid));
      await deleteUser(currentUser);
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Account deletion failed:", error);

      if (error?.code === "auth/popup-closed-by-user") {
        return;
      }

      if (error?.code === "auth/wrong-password") {
        setDeleteError(t("profile.delete.errors.wrongPassword"));
        return;
      }

      if (error?.code === "auth/requires-recent-login") {
        setDeleteError(t("profile.delete.errors.requiresRecentLogin"));
        return;
      }

      setDeleteError(t("profile.delete.errors.deleteFailed"));
    } finally {
      setDeletingAccount(false);
    }
  };

  const isPasswordProviderUser = Boolean(
    user?.providerData?.some((provider) => provider?.providerId === "password"),
  );
  const isEmailVerificationPending = Boolean(
    user && isPasswordProviderUser && !user.emailVerified,
  );

  // Loading dok Firebase inicijalizira
  if (authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
        <CircularProgress sx={{ color: "#5ebb4c" }} />
      </Box>
    );
  }

  // Nije prijavljen (ili email/password korisnik bez verifikacije)
  if (!user || isEmailVerificationPending) {
    return (
      <>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "60vh",
            gap: 3,
            px: 3,
          }}
        >
          <Box
            sx={{
              width: 100,
              height: 100,
              borderRadius: "50%",
              backgroundColor: "#f0faf0",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontSize: "48px" }}>💪</Typography>
          </Box>

          <Typography
            sx={{ fontSize: "24px", fontWeight: 800, textAlign: "center" }}
          >
            {t("profile.title")}
          </Typography>

          <Typography
            sx={{
              color: isEmailVerificationPending ? "#e53935" : "#888",
              textAlign: "center",
              maxWidth: "280px",
              lineHeight: 1.5,
            }}
          >
            {isEmailVerificationPending
              ? t("profile.auth.errors.emailNotVerified")
              : t("profile.loginPrompt")}
          </Typography>

          {isEmailVerificationPending && (
            <Typography
              sx={{
                color: "#2e7d32",
                textAlign: "center",
                maxWidth: "320px",
                fontSize: "13px",
                lineHeight: 1.5,
              }}
            >
              {t("profile.auth.verificationSentOnRegister")}
            </Typography>
          )}

          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: "16px 48px",
              borderRadius: "16px",
              border: "none",
              backgroundColor: "#5ebb4c",
              color: "#fff",
              fontSize: "17px",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "Josefin Sans, sans-serif",
              boxShadow: "0 4px 16px rgba(94,187,76,0.35)",
            }}
          >
            {t("profile.auth.login")}
          </button>
        </Box>

        {showModal && <AuthModal onClose={() => setShowModal(false)} />}
      </>
    );
  }

  // Prijavljen - podaci
  const displayName =
    userProfile?.displayName ||
    user.displayName ||
    user.email ||
    t("profile.userFallback");
  const email = userProfile?.email || user.email;
  const birthDate = userProfile?.birthDate;
  // Čitaj sliku iz Firestorea (gdje je data URL slika pohranjena), ne iz Auth-a
  const photoURL = userProfile?.photoURL || user.photoURL || null;
  const initials = String(displayName).charAt(0).toUpperCase();
  const formattedBirthDate = birthDate
    ? (() => {
        const parsed = new Date(birthDate);
        const language =
          (typeof navigator !== "undefined" && navigator.language) || "en-US";
        return Number.isNaN(parsed.getTime())
          ? null
          : parsed.toLocaleDateString(language);
      })()
    : null;

  return (
    <>
      <Box sx={{ padding: "20px 20px 40px" }}>
        {/* Profil kartica */}
        <Box
          className="light-surface"
          sx={{
            backgroundColor: "#f2f2f2",
            borderRadius: "20px",
            padding: "24px 20px",
            mb: 3,
            position: "relative",
            border: "1px solid #f0f0f0",
          }}
        >
          {/* Edit / Delete / Logout gumbi */}
          <Stack
            direction="row"
            spacing={1}
            sx={{ position: "absolute", top: "16px", right: "16px" }}
          >
            <IconButton
              onClick={() => setShowEditModal(true)}
              sx={{
                backgroundColor: "#fff",
                border: "1.5px solid #e0e0e0",
                "&:hover": { backgroundColor: "#f0f0f0", borderColor: "#9e9e9e" },
              }}
              title={t("profile.edit.title")}
            >
              <EditOutlinedIcon sx={{ fontSize: "18px", color: "#020202" }} />
            </IconButton>
            <IconButton
              onClick={handleDeleteAccountClick}
              sx={{
                backgroundColor: "#fff",
                border: "1.5px solid #e0e0e0",
                "&:hover": { backgroundColor: "#fee", borderColor: "#e53935" },
              }}
              title={t("profile.delete.action")}
            >
              <DeleteOutlineIcon sx={{ fontSize: "18px", color: "#e53935" }} />
            </IconButton>
            <IconButton
              onClick={() => setLogoutDialogOpen(true)}
              sx={{
                backgroundColor: "#fff",
                border: "1.5px solid #e0e0e0",
                "&:hover": { backgroundColor: "#fee", borderColor: "#e53935" },
              }}
              title={t("profile.logout")}
            >
              <LogoutIcon sx={{ fontSize: "18px", color: "#e53935" }} />
            </IconButton>
          </Stack>

          {/* Avatar + info */}
          <Stack direction="row" spacing={2.5} alignItems="center">
            <Avatar
              src={photoURL || undefined}
              sx={{
                width: 80,
                height: 80,
                fontSize: "32px",
                backgroundColor: "#5ebb4c",
                border: "3px solid #fff",
                boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
              }}
            >
              {!photoURL && initials}
            </Avatar>

            <Box>
              <Typography
                sx={{ fontSize: "20px", fontWeight: 800, lineHeight: 1.2 }}
              >
                {displayName}
              </Typography>
              <Typography sx={{ fontSize: "13px", color: "#888", mt: 0.5 }}>
                {email}
              </Typography>
              {formattedBirthDate && (
                <Typography sx={{ fontSize: "12px", color: "#aaa", mt: 0.3 }}>
                  🎂 {formattedBirthDate}
                </Typography>
              )}
            </Box>
          </Stack>

          {/* Statistike */}
          <Stack direction="row" sx={{ mt: 3 }}>
            <Box
              sx={{
                flex: 1,
                backgroundColor: "#fff",
                borderRadius: "12px",
                padding: "12px",
                textAlign: "center",
              }}
            >
              <Typography
                className="profile-favorite-count"
                sx={{
                  fontSize: "28px",
                  fontWeight: 800,
                  color: "#5ebb4c",
                }}
              >
                {favoriteCount}
              </Typography>
              <Typography sx={{ fontSize: "12px", color: "#888" }}>
                {t("profile.favoriteExercises")}
              </Typography>
            </Box>
          </Stack>
        </Box>

        {/* Omiljene vježbe */}
        <Typography sx={{ fontSize: "20px", fontWeight: 800, mb: 2 }}>
          {t("profile.favorites")} ({favoriteCount})
        </Typography>

        {favoriteCount === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "#bbb" }}>
            <Typography sx={{ fontSize: "40px", mb: 1 }}>🤍</Typography>
            <Typography sx={{ fontSize: "15px" }}>
              {t("profile.noFavorites")}
            </Typography>
          </Box>
        ) : loadingFavorites ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress sx={{ color: "#5ebb4c" }} />
          </Box>
        ) : favoriteExercises.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6, color: "#888" }}>
            <Typography sx={{ fontSize: "15px" }}>
              {t("profile.favoritesApiUnavailable")}
            </Typography>
            <Typography sx={{ fontSize: "13px", mt: 1, color: "#aaa" }}>
              {t("profile.tryAgainSoon")}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={2}>
            {unresolvedFavoritesCount > 0 && (
              <Typography
                className="profile-warning-text"
                sx={{
                  fontSize: "13px",
                }}
              >
                {t("profile.unresolvedFavorites", {
                  count: unresolvedFavoritesCount,
                })}
              </Typography>
            )}
            {pagedFavoriteExercises.map((exercise) => (
              <Box
                key={exercise.id}
                className="light-surface"
                onClick={() => navigate(`/exercise/${exercise.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigate(`/exercise/${exercise.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  backgroundColor: "#f2f2f2",
                  borderRadius: "16px",
                  padding: "12px",
                  border: "1px solid #f0f0f0",
                  cursor: "pointer",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
                  },
                  "&:focus-visible": {
                    outline: "2px solid #5ebb4c",
                    outlineOffset: "2px",
                  },
                }}
              >
                <ExerciseImage
                  exercise={exercise}
                  fallbackSrc={placeholder}
                  alt={exercise.name}
                  style={{
                    width: "70px",
                    height: "70px",
                    borderRadius: "10px",
                    objectFit: "cover",
                  }}
                />
                <Box sx={{ flex: 1 }}>
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: "15px",
                      textTransform: "capitalize",
                      color: "#111 !important",
                    }}
                  >
                    {exercise.name}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "12px",
                      color: "#333 !important",
                      textTransform: "capitalize",
                    }}
                  >
                    {exercise.target} · {exercise.equipment}
                  </Typography>
                </Box>
              </Box>
            ))}

            {totalFavoritePages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", pt: 1 }}>
                <Pagination
                  count={totalFavoritePages}
                  page={favoritesPage}
                  onChange={(_, page) => setFavoritesPage(page)}
                  color="success"
                  shape="rounded"
                  siblingCount={0}
                  boundaryCount={1}
                />
              </Box>
            )}
          </Stack>
        )}

        <Box sx={{ mt: 4, width: "100%" }}>
          <WorkoutPlanner />
        </Box>
      </Box>

      {showEditModal && user && (
        <EditProfileModal
          onClose={closeEditModal}
          user={user}
          userProfile={userProfile}
        />
      )}

      {/* Logout Confirmation Dialog */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Sign out of {displayName}</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to sign out of {displayName}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogoutDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleLogout} variant="contained" color="error">
            Sign out
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ color: "#e53935", fontWeight: 700 }}>
          Delete account
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Are you sure you want to delete your account? This action cannot be
            undone.
          </Typography>
          <Typography variant="caption" sx={{ color: "#e53935" }}>
            All your data will be permanently deleted.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={deletingAccount}
          >
            {deletingAccount ? "Deleting..." : "Delete account"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Profile;
