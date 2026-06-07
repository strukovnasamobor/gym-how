import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

import { AppContext } from "../AppContext";
import { db } from "../../firebase";
import {
  EXERCISES_CACHE_KEY,
  fetchAllExercises,
  readCachedJson,
  writeCachedJson,
} from "../utils/fetchData";
import ExerciseImage from "../components/ExerciseImage";

const DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const PENDING_PLAN_ADD_KEY = "gymhow-pending-plan-add";

const createEmptyWeek = () =>
  DAY_KEYS.reduce((acc, key) => {
    acc[key] = [];
    return acc;
  }, {});

const normalizeExerciseId = (exercise) => {
  const candidate =
    exercise?.id ??
    exercise?.exerciseId ??
    exercise?.exercise_id ??
    exercise?._id ??
    exercise?.uuid;

  if (candidate === undefined || candidate === null) {
    return "";
  }

  return String(candidate).trim();
};

const WorkoutPlanner = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, authLoading, isDarkMode } = useContext(AppContext);
  const topRef = useRef(null);
  const isMobile = useMediaQuery("(max-width:899.95px)");

  const [exercises, setExercises] = useState([]);
  const [exercisesLoading, setExercisesLoading] = useState(true);
  const [weekPlan, setWeekPlan] = useState(() => createEmptyWeek());
  const [planLoading, setPlanLoading] = useState(false);
  const [createdAt, setCreatedAt] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const pendingAppliedRef = useRef(false);

  const [selectedDay, setSelectedDay] = useState("monday");
  const [selectedExerciseId, setSelectedExerciseId] = useState("");
  const [setsValue, setSetsValue] = useState("3");
  const [repsValue, setRepsValue] = useState("10");
  const [dragSourceDay, setDragSourceDay] = useState(null);
  const [dragSourceEntryId, setDragSourceEntryId] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const touchStartRef = useRef(null);
  const [moveMenuAnchor, setMoveMenuAnchor] = useState(null);
  const [moveMenuEntryId, setMoveMenuEntryId] = useState(null);
  const [moveMenuDay, setMoveMenuDay] = useState(null);

  const handleDragStart = (e, dayKey, entryId) => {
    setDragSourceDay(dayKey);
    setDragSourceEntryId(entryId);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", entryId);
    }
  };

  const handleTouchStart = (e, dayKey, entryId) => {
    touchStartRef.current = { dayKey, entryId, timestamp: Date.now() };
    setDragSourceDay(dayKey);
    setDragSourceEntryId(entryId);
    e.preventDefault();
  };

  const handleTouchMove = (e) => {
    if (touchStartRef.current) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    if (!touchStartRef.current || !dragSourceDay || !dragSourceEntryId) {
      touchStartRef.current = null;
      return;
    }

    const touch = e.changedTouches?.[0];
    if (!touch) {
      touchStartRef.current = null;
      return;
    }

    // Find the element at the touch end position
    const elementAtPoint = document.elementFromPoint(
      touch.clientX,
      touch.clientY,
    );

    // Find the Card parent element (look up the DOM tree)
    let cardElement = elementAtPoint;
    while (
      cardElement &&
      cardElement.getAttribute?.("data-day-card") !== "true"
    ) {
      cardElement = cardElement.parentElement;
    }

    if (cardElement) {
      const targetDay = cardElement.getAttribute("data-day-key");
      if (targetDay && dragSourceDay && dragSourceEntryId) {
        if (dragSourceDay !== targetDay) {
          const sourceEntries = weekPlan[dragSourceDay] || [];
          const entryIndex = sourceEntries.findIndex(
            (e) => e.id === dragSourceEntryId,
          );

          if (entryIndex !== -1) {
            const movedEntry = sourceEntries[entryIndex];
            setWeekPlan((prev) => ({
              ...prev,
              [dragSourceDay]: sourceEntries.filter((_, i) => i !== entryIndex),
              [targetDay]: [...(prev[targetDay] || []), movedEntry],
            }));
          }
        }
      }
    }

    setDragSourceDay(null);
    setDragSourceEntryId(null);
    touchStartRef.current = null;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropOnDay = (e, targetDayKey) => {
    e.preventDefault();
    if (dragSourceDay && dragSourceEntryId) {
      if (dragSourceDay === targetDayKey) {
        setDragSourceDay(null);
        setDragSourceEntryId(null);
        return;
      }

      const sourceEntries = weekPlan[dragSourceDay] || [];
      const entryIndex = sourceEntries.findIndex(
        (e) => e.id === dragSourceEntryId,
      );

      if (entryIndex !== -1) {
        const movedEntry = sourceEntries[entryIndex];
        setWeekPlan((prev) => ({
          ...prev,
          [dragSourceDay]: sourceEntries.filter((_, i) => i !== entryIndex),
          [targetDayKey]: [...(prev[targetDayKey] || []), movedEntry],
        }));
      }
    }
    setDragSourceDay(null);
    setDragSourceEntryId(null);
  };

  const moveExerciseUp = (dayKey, entryId) => {
    setWeekPlan((prev) => {
      const entries = [...(prev[dayKey] || [])];
      const index = entries.findIndex((e) => e.id === entryId);
      if (index > 0) {
        [entries[index], entries[index - 1]] = [
          entries[index - 1],
          entries[index],
        ];
      }
      return {
        ...prev,
        [dayKey]: entries,
      };
    });
  };

  const moveExerciseDown = (dayKey, entryId) => {
    setWeekPlan((prev) => {
      const entries = [...(prev[dayKey] || [])];
      const index = entries.findIndex((e) => e.id === entryId);
      if (index < entries.length - 1) {
        [entries[index], entries[index + 1]] = [
          entries[index + 1],
          entries[index],
        ];
      }
      return {
        ...prev,
        [dayKey]: entries,
      };
    });
  };

  const moveEntryToDay = (fromDay, entryId, toDay) => {
    setWeekPlan((prev) => {
      const fromEntries = prev[fromDay] || [];
      const entryIndex = fromEntries.findIndex((e) => e.id === entryId);
      if (entryIndex === -1) return prev;
      const entry = fromEntries[entryIndex];
      return {
        ...prev,
        [fromDay]: fromEntries.filter((_, i) => i !== entryIndex),
        [toDay]: [...(prev[toDay] || []), entry],
      };
    });
    setMoveMenuAnchor(null);
    setMoveMenuEntryId(null);
    setMoveMenuDay(null);
  };

  const readPendingAdd = () => {
    try {
      const stored = localStorage.getItem(PENDING_PLAN_ADD_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn("Failed to read pending plan add:", error);
      return null;
    }
  };

  const clearPendingAdd = () => {
    try {
      localStorage.removeItem(PENDING_PLAN_ADD_KEY);
    } catch (error) {
      console.warn("Failed to clear pending plan add:", error);
    }
  };

  const appendEntryToDay = (dayKey, selectedExercise, sets, reps) => {
    const selectedId = normalizeExerciseId(selectedExercise);

    if (!selectedId) {
      return false;
    }

    const nextEntry = {
      id: `${selectedId}-${Date.now()}`,
      exerciseId: selectedId,
      name: selectedExercise?.name || t("planner.unknownExercise"),
      sets: Math.max(1, Number(sets) || 1),
      reps: Math.max(1, Number(reps) || 1),
    };

    setWeekPlan((prev) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), nextEntry],
    }));

    if (dayKey !== selectedDay) {
      setSelectedDay(dayKey);
    }

    setSaveState("idle");
    return true;
  };

  const dayOptions = useMemo(
    () =>
      DAY_KEYS.map((key) => ({
        key,
        label: t(`planner.days.${key}`),
      })),
    [t],
  );

  useEffect(() => {
    const loadExercises = async () => {
      setExercisesLoading(true);

      try {
        const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, []);
        if (Array.isArray(cachedExercises) && cachedExercises.length > 0) {
          setExercises(cachedExercises);
          return;
        }

        const fetched = await fetchAllExercises();
        if (Array.isArray(fetched)) {
          writeCachedJson(EXERCISES_CACHE_KEY, fetched);
          setExercises(fetched);
        } else {
          setExercises([]);
        }
      } catch (error) {
        console.error("Failed to load exercises for planner:", error);
        setExercises([]);
      } finally {
        setExercisesLoading(false);
      }
    };

    loadExercises();
  }, []);

  useEffect(() => {
    const loadPlan = async () => {
      if (!user) {
        setWeekPlan(createEmptyWeek());
        setCreatedAt("");
        return;
      }

      setPlanLoading(true);

      try {
        const planRef = doc(db, "workoutPlans", user.uid);
        const planSnap = await getDoc(planRef);

        if (planSnap.exists()) {
          const data = planSnap.data();
          setWeekPlan({ ...createEmptyWeek(), ...data.week });
          setCreatedAt(String(data.createdAt || ""));
        } else {
          setWeekPlan(createEmptyWeek());
          setCreatedAt("");
        }
      } catch (error) {
        console.error("Failed to load workout plan:", error);
        setWeekPlan(createEmptyWeek());
      } finally {
        setPlanLoading(false);
      }
    };

    loadPlan();
  }, [user]);

  useEffect(() => {
    const handleQuickAdd = (event) => {
      const detail = event?.detail || {};
      const targetDay =
        typeof detail.dayKey === "string" && detail.dayKey
          ? detail.dayKey
          : selectedDay;
      const fallbackExercise = exercises.find(
        (exercise) => normalizeExerciseId(exercise) === detail.exerciseId,
      );
      const selectedExercise = detail.exercise || fallbackExercise;
      const added = appendEntryToDay(
        targetDay,
        selectedExercise,
        Math.max(1, Number(detail.sets) || 3),
        Math.max(1, Number(detail.reps) || 10),
      );

      if (added && detail.pendingId) {
        const pending = readPendingAdd();
        if (pending?.id === detail.pendingId) {
          clearPendingAdd();
        }
      }
    };

    window.addEventListener("gymhow-add-to-plan", handleQuickAdd);
    return () =>
      window.removeEventListener("gymhow-add-to-plan", handleQuickAdd);
  }, [exercises, selectedDay, t]);

  useEffect(() => {
    if (pendingAppliedRef.current) {
      return;
    }

    if (exercisesLoading || planLoading) {
      return;
    }

    const pending = readPendingAdd();
    if (!pending) {
      pendingAppliedRef.current = true;
      return;
    }

    const fallbackExercise = exercises.find(
      (exercise) => normalizeExerciseId(exercise) === pending.exerciseId,
    );
    const selectedExercise = pending.exercise || fallbackExercise;
    const targetDay =
      typeof pending.dayKey === "string" && pending.dayKey
        ? pending.dayKey
        : selectedDay;

    const added = appendEntryToDay(targetDay, selectedExercise, 3, 10);
    if (added) {
      clearPendingAdd();
    }

    pendingAppliedRef.current = true;
  }, [exercisesLoading, planLoading, exercises, selectedDay, t]);

  const addExerciseToDay = () => {
    if (!selectedExerciseId) {
      return;
    }

    const selectedExercise = exercises.find(
      (exercise) => normalizeExerciseId(exercise) === selectedExerciseId,
    );
    appendEntryToDay(selectedDay, selectedExercise, setsValue, repsValue);
  };

  const updateEntry = (dayKey, entryId, field, value) => {
    setWeekPlan((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).map((entry) => {
        if (entry.id !== entryId) {
          return entry;
        }

        return {
          ...entry,
          [field]: Math.max(1, Number(value) || 1),
        };
      }),
    }));

    setSaveState("idle");
  };

  const removeEntry = (dayKey, entryId) => {
    setWeekPlan((prev) => ({
      ...prev,
      [dayKey]: (prev[dayKey] || []).filter((entry) => entry.id !== entryId),
    }));

    setSaveState("idle");
  };

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setSaveState("saving");

    try {
      const planRef = doc(db, "workoutPlans", user.uid);
      const payload = {
        userId: user.uid,
        week: weekPlan,
        createdAt: createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(planRef, payload, { merge: true });
      if (!createdAt) {
        setCreatedAt(payload.createdAt);
      }
      setSaveState("saved");
    } catch (error) {
      console.error("Failed to save workout plan:", error);
      setSaveState("error");
    }
  };

  const saveLabel =
    saveState === "saving"
      ? t("planner.saving")
      : saveState === "saved"
        ? t("planner.saved")
        : saveState === "error"
          ? t("planner.saveError")
          : t("planner.save");

  const isBusy = authLoading || planLoading;
  const pageBackground = isDarkMode
    ? "radial-gradient(circle at top, rgba(31, 111, 235, 0.18), transparent 36%), linear-gradient(180deg, #0b0f14 0%, #11161d 100%)"
    : "#f3f3f3";
  const surfaceColor = isDarkMode ? "#101820" : "rgba(255, 255, 255, 0.88)";
  const surfaceBorder = isDarkMode
    ? "1px solid rgba(255, 255, 255, 0.12)"
    : "1px solid rgba(0, 0, 0, 0.08)";
  const accent = isDarkMode ? "#4ea1ff" : "#1f6feb";
  const accentSoft = isDarkMode
    ? "rgba(78, 161, 255, 0.14)"
    : "rgba(31, 111, 235, 0.08)";
  const inputStyles = {
    "& .MuiInputBase-root": {
      backgroundColor: isDarkMode ? "#121b25" : "rgba(255, 255, 255, 0.92)",
      color: isDarkMode ? "#f4f7fb" : "#121212",
      borderRadius: "12px",
    },
    "& .MuiInputLabel-root": {
      color: isDarkMode ? "#aeb8c5" : "#667085",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: isDarkMode
        ? "rgba(255, 255, 255, 0.18)"
        : "rgba(0, 0, 0, 0.12)",
    },
    "& .MuiSvgIcon-root": {
      color: isDarkMode ? "#b7c0cc" : "#5f6368",
    },
  };

  return (
    <Box
      ref={topRef}
      id="workout-planner"
      sx={{
        width: "100%",
        px: { xs: 2, sm: 3 },
        py: { xs: 3, sm: 4 },
        background: pageBackground,
        borderRadius: { xs: 0, sm: 4 },
      }}
    >
      <Stack spacing={3.5} sx={{ width: "100%" }}>
        <Box
          sx={{
            width: "100%",
            position: "relative",
            overflow: "hidden",
            p: { xs: 2.25, sm: 3 },
            borderRadius: 4,
            border: surfaceBorder,
            background: isDarkMode
              ? "linear-gradient(135deg, rgba(18, 24, 32, 0.95), rgba(12, 16, 22, 0.92))"
              : "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(244, 247, 252, 0.9))",
            boxShadow: isDarkMode
              ? "0 18px 50px rgba(0, 0, 0, 0.34)"
              : "0 18px 45px rgba(15, 23, 42, 0.08)",
            "&:before": {
              content: '""',
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(120deg, rgba(31, 111, 235, 0.16), transparent 34%, transparent 66%, rgba(31, 111, 235, 0.08))",
              pointerEvents: "none",
            },
          }}
        >
          <Stack spacing={1.5} sx={{ position: "relative", zIndex: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              gap={2}
              flexWrap="wrap"
            >
              <Box>
                <Typography
                  variant="h4"
                  fontWeight={900}
                  sx={{ letterSpacing: "-0.03em" }}
                >
                  {t("planner.title")}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.5,
                    color: isDarkMode ? "#b8c3d0" : "#566070",
                    maxWidth: 680,
                  }}
                >
                  {t("planner.subtitle")}
                </Typography>
              </Box>
            </Stack>
          </Stack>
        </Box>

        {!user && !isBusy && (
          <Card
            sx={{
              backgroundColor: surfaceColor,
              border: surfaceBorder,
              boxShadow: isDarkMode
                ? "0 16px 36px rgba(0, 0, 0, 0.22)"
                : "0 12px 24px rgba(15, 23, 42, 0.06)",
              borderRadius: 4,
            }}
          >
            <CardContent>
              <Typography
                sx={{
                  background: isDarkMode
                    ? "linear-gradient(135deg, rgba(31, 41, 55, 0.95), rgba(18, 24, 32, 0.95))"
                    : "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(245,247,250,0.96))",
                  color: isDarkMode ? "#f4f7fb" : "#0f172a",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  textAlign: "center",
                  fontWeight: 700,
                  border: isDarkMode
                    ? "1px solid rgba(78, 161, 255, 0.18)"
                    : "1px solid rgba(31, 111, 235, 0.10)",
                }}
              >
                {t("planner.loginPrompt")}
              </Typography>
            </CardContent>
          </Card>
        )}

        {isBusy && (
          <Stack direction="row" spacing={1} alignItems="center">
            <CircularProgress size={20} />
            <Typography>{t("planner.loading")}</Typography>
          </Stack>
        )}

        <Card
          sx={{
            width: "100%",
            backgroundColor: surfaceColor,
            border: surfaceBorder,
            boxShadow: isDarkMode
              ? "0 16px 36px rgba(0, 0, 0, 0.22)"
              : "0 12px 24px rgba(15, 23, 42, 0.06)",
            borderRadius: 4,
            overflow: "hidden",
            position: "relative",
            "&:before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background: `linear-gradient(90deg, ${accent}, ${isDarkMode ? "#7cc4ff" : "#54a1ff"})`,
            },
          }}
        >
          <CardContent>
            <Stack spacing={2.25} sx={{ pt: 0.5 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                gap={2}
                flexWrap="wrap"
              >
                <Typography fontWeight={800} sx={{ letterSpacing: "-0.01em" }}>
                  {t("planner.addTitle")}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: isDarkMode ? "#9ca8b6" : "#687385" }}
                >
                  {t("planner.form.helper")}
                </Typography>
              </Stack>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: {
                    xs: "1fr",
                    sm: "1fr 1.5fr",
                    md: "1fr 1.5fr 0.55fr 0.55fr",
                  },
                  gap: 1.5,
                }}
              >
                <TextField
                  select
                  label={t("planner.form.day")}
                  value={selectedDay}
                  onChange={(event) => setSelectedDay(event.target.value)}
                  sx={{ ...inputStyles }}
                >
                  {dayOptions.map((day) => (
                    <MenuItem key={day.key} value={day.key}>
                      {day.label}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  select
                  label={t("planner.form.exercise")}
                  value={selectedExerciseId}
                  onChange={(event) =>
                    setSelectedExerciseId(event.target.value)
                  }
                  sx={{ ...inputStyles }}
                  disabled={exercisesLoading}
                >
                  {exercisesLoading && (
                    <MenuItem value="">
                      {t("planner.loadingExercises")}
                    </MenuItem>
                  )}
                  {!exercisesLoading && exercises.length === 0 && (
                    <MenuItem value="">{t("planner.noExercises")}</MenuItem>
                  )}
                  {!exercisesLoading &&
                    exercises.map((exercise) => {
                      const exerciseId = normalizeExerciseId(exercise);
                      if (!exerciseId) {
                        return null;
                      }

                      return (
                        <MenuItem key={exerciseId} value={exerciseId}>
                          {exercise.name}
                        </MenuItem>
                      );
                    })}
                </TextField>

                <TextField
                  type="number"
                  label={t("planner.form.sets")}
                  value={setsValue}
                  onChange={(event) => setSetsValue(event.target.value)}
                  onFocus={(e) => e.target.select()}
                  inputProps={{ min: 1, step: 1 }}
                  sx={{ ...inputStyles }}
                />
                <TextField
                  type="number"
                  label={t("planner.form.reps")}
                  value={repsValue}
                  onChange={(event) => setRepsValue(event.target.value)}
                  onFocus={(e) => e.target.select()}
                  inputProps={{ min: 1, step: 1 }}
                  sx={{ ...inputStyles }}
                />
              </Box>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                alignItems={{ xs: "stretch", sm: "center" }}
                sx={{ pt: 0.25 }}
              >
                <Button
                  variant="contained"
                  onClick={addExerciseToDay}
                  disabled={!selectedExerciseId || exercisesLoading}
                  sx={{
                    minHeight: 44,
                    borderRadius: 999,
                    px: 2.2,
                    backgroundColor: accent,
                    color: "#ffffff",
                    boxShadow: isDarkMode
                      ? "0 10px 22px rgba(31, 111, 235, 0.28)"
                      : "0 10px 20px rgba(31, 111, 235, 0.20)",
                    "&:hover": {
                      backgroundColor: isDarkMode ? "#5aa6ff" : "#155ecf",
                    },
                    "&.Mui-disabled": {
                      backgroundColor: isDarkMode ? "#253040" : "#e5eefc",
                      color: isDarkMode ? "#cfd8e3" : "#8aa2c8",
                      opacity: 1,
                    },
                  }}
                >
                  {t("planner.add")}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleSave}
                  disabled={!user || saveState === "saving"}
                  startIcon={<SaveOutlinedIcon />}
                  sx={{
                    minHeight: 44,
                    borderRadius: 999,
                    px: 2.2,
                    borderColor: isDarkMode
                      ? "rgba(255, 255, 255, 0.22)"
                      : "rgba(31, 111, 235, 0.24)",
                    color: isDarkMode ? "#eef4fb" : accent,
                    backgroundColor: isDarkMode
                      ? "#121b25"
                      : "rgba(255,255,255,0.92)",
                    "&:hover": {
                      backgroundColor: isDarkMode
                        ? "#172230"
                        : "rgba(31, 111, 235, 0.08)",
                      borderColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.38)"
                        : "rgba(31, 111, 235, 0.34)",
                    },
                    "&.Mui-disabled": {
                      color: isDarkMode ? "#cfd8e3" : "#8aa2c8",
                      borderColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.24)"
                        : "rgba(31, 111, 235, 0.16)",
                      backgroundColor: isDarkMode
                        ? "#151e29"
                        : "rgba(255,255,255,0.7)",
                      opacity: 1,
                    },
                  }}
                >
                  {saveLabel}
                </Button>
                <Button
                  variant={reorderMode ? "contained" : "outlined"}
                  onClick={() => setReorderMode(!reorderMode)}
                  startIcon={<UnfoldMoreIcon />}
                  sx={{
                    minHeight: 44,
                    borderRadius: 999,
                    px: 2.2,
                    borderColor: isDarkMode
                      ? "rgba(255, 255, 255, 0.22)"
                      : "rgba(31, 111, 235, 0.24)",
                    color: reorderMode
                      ? "#fff"
                      : isDarkMode
                        ? "#eef4fb"
                        : accent,
                    backgroundColor: reorderMode
                      ? isDarkMode
                        ? "#1f6db1"
                        : accent
                      : isDarkMode
                        ? "#121b25"
                        : "rgba(255,255,255,0.92)",
                    "&:hover": {
                      backgroundColor: reorderMode
                        ? isDarkMode
                          ? "#2878c8"
                          : "#115ab0"
                        : isDarkMode
                          ? "#172230"
                          : "rgba(31, 111, 235, 0.08)",
                      borderColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.38)"
                        : "rgba(31, 111, 235, 0.34)",
                    },
                  }}
                >
                  {reorderMode ? "Done reordering" : "Reorder"}
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Box
          sx={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
            gap: 2,
          }}
        >
          {dayOptions.map((day) => (
            <Card
              key={day.key}
              data-day-card="true"
              data-day-key={day.key}
              onDragOver={isMobile ? undefined : handleDragOver}
              onDrop={isMobile ? undefined : (e) => handleDropOnDay(e, day.key)}
              sx={{
                backgroundColor: surfaceColor,
                border: surfaceBorder,
                boxShadow: isDarkMode
                  ? "0 14px 32px rgba(0, 0, 0, 0.18)"
                  : "0 10px 22px rgba(15, 23, 42, 0.05)",
                borderRadius: 4,
                overflow: "hidden",
                transition: "transform 0.18s ease, box-shadow 0.18s ease",
                "&:hover": {
                  transform: "translateY(-1px)",
                  boxShadow: isDarkMode
                    ? "0 18px 36px rgba(0, 0, 0, 0.26)"
                    : "0 14px 28px rgba(15, 23, 42, 0.08)",
                },
              }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{
                      pb: 0.5,
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          backgroundColor: accent,
                          boxShadow: `0 0 0 6px ${accentSoft}`,
                        }}
                      />
                      <Typography
                        fontWeight={800}
                        sx={{ letterSpacing: "-0.01em" }}
                      >
                        {day.label}
                      </Typography>
                    </Stack>
                    <Chip
                      label={`${
                        (weekPlan[day.key] || []).length
                      } ${t("planner.exercisesCount")}`}
                      size="small"
                      sx={{
                        backgroundColor: accentSoft,
                        color: isDarkMode ? "#d9e9ff" : accent,
                        fontWeight: 700,
                      }}
                    />
                  </Stack>

                  <Divider
                    sx={{
                      borderColor: isDarkMode
                        ? "rgba(255, 255, 255, 0.08)"
                        : undefined,
                    }}
                  />

                  {(weekPlan[day.key] || []).length === 0 ? (
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        border: isDarkMode
                          ? "1px dashed rgba(255,255,255,0.12)"
                          : "1px dashed rgba(31,111,235,0.18)",
                        backgroundColor: isDarkMode
                          ? "rgba(18, 24, 32, 0.75)"
                          : "rgba(31, 111, 235, 0.03)",
                      }}
                    >
                      <Typography color="text.secondary">
                        {t("planner.emptyDay")}
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={1.5}>
                      {(weekPlan[day.key] || []).map((entry) => (
                        <Stack
                          key={entry.id}
                          draggable={!isMobile}
                          onDragStart={
                            isMobile
                              ? undefined
                              : (e) => handleDragStart(e, day.key, entry.id)
                          }
                          onDragEnd={
                            isMobile
                              ? undefined
                              : () => {
                                  setDragSourceDay(null);
                                  setDragSourceEntryId(null);
                                  touchStartRef.current = null;
                                }
                          }
                          onTouchStart={
                            isMobile
                              ? undefined
                              : (e) => handleTouchStart(e, day.key, entry.id)
                          }
                          onTouchMove={isMobile ? undefined : handleTouchMove}
                          onTouchEnd={isMobile ? undefined : handleTouchEnd}
                          direction={{ xs: "column", sm: "row" }}
                          spacing={1}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                          sx={{
                            cursor: isMobile ? "default" : "grab",
                            touchAction: isMobile ? "manipulation" : "none",
                            userSelect: "none",
                            WebkitUserSelect: "none",
                            "&:active": !isMobile
                              ? {
                                  cursor: "grabbing",
                                }
                              : undefined,
                            opacity: dragSourceEntryId === entry.id ? 0.5 : 1,
                            transition: "opacity 0.2s ease",
                            borderRadius: "16px",
                            border: isDarkMode
                              ? "1px solid rgba(255, 255, 255, 0.08)"
                              : "1px solid rgba(15, 23, 42, 0.06)",
                            padding: "12px",
                            backgroundColor: isDarkMode
                              ? "linear-gradient(135deg, rgba(18, 26, 34, 0.88), rgba(15, 22, 30, 0.88))"
                              : "linear-gradient(135deg, rgba(255,255,255,0.96), rgba(250,252,255,0.96))",
                            boxShadow: isDarkMode
                              ? "0 10px 24px rgba(0, 0, 0, 0.16)"
                              : "0 8px 18px rgba(15, 23, 42, 0.04)",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 1,
                              width: { xs: "100%", sm: "auto" },
                              order: { xs: 1, sm: 0 },
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography fontWeight={600}>
                                {entry.name}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{
                                  color: isDarkMode ? "#93a2b6" : "#667085",
                                }}
                              >
                                {t("planner.entryCaption", {
                                  sets: entry.sets,
                                  reps: entry.reps,
                                  defaultValue: `${entry.sets} x ${entry.reps}`,
                                })}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                width: { xs: "50px", sm: "60px" },
                                height: { xs: "50px", sm: "60px" },
                                borderRadius: "12px",
                                overflow: "hidden",
                                flexShrink: 0,
                                backgroundColor: isDarkMode
                                  ? "rgba(31, 41, 55, 0.5)"
                                  : "rgba(31, 111, 235, 0.08)",
                                border: isDarkMode
                                  ? "1px solid rgba(255, 255, 255, 0.1)"
                                  : "1px solid rgba(31, 111, 235, 0.15)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                              }}
                              onClick={() =>
                                navigate(`/exercise/${entry.exerciseId}`)
                              }
                            >
                              <ExerciseImage
                                exercise={exercises.find(
                                  (ex) =>
                                    normalizeExerciseId(ex) ===
                                    entry.exerciseId,
                                )}
                                fallbackSrc="https://via.placeholder.com/60?text=Exercise"
                                alt={entry.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                }}
                              />
                            </Box>
                          </Box>

                          <Stack
                            direction={{ xs: "column", sm: "row" }}
                            spacing={1}
                            alignItems={{ xs: "stretch", sm: "center" }}
                            sx={{
                              order: { xs: 2, sm: 0 },
                              width: { xs: "100%", sm: "auto" },
                            }}
                          >
                            <TextField
                              type="number"
                              label={t("planner.form.sets")}
                              value={entry.sets}
                              onChange={(event) =>
                                updateEntry(
                                  day.key,
                                  entry.id,
                                  "sets",
                                  event.target.value,
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              inputProps={{ min: 1, step: 1 }}
                              sx={{
                                width: { xs: "100%", sm: "110px" },
                                ...inputStyles,
                              }}
                            />
                            <TextField
                              type="number"
                              label={t("planner.form.reps")}
                              value={entry.reps}
                              onChange={(event) =>
                                updateEntry(
                                  day.key,
                                  entry.id,
                                  "reps",
                                  event.target.value,
                                )
                              }
                              onFocus={(e) => e.target.select()}
                              inputProps={{ min: 1, step: 1 }}
                              sx={{
                                width: { xs: "100%", sm: "110px" },
                                ...inputStyles,
                              }}
                            />
                            <Stack
                              direction="row"
                              spacing={0.5}
                              sx={{ display: "flex" }}
                            >
                              <IconButton
                                aria-label={t("planner.remove")}
                                onClick={() => removeEntry(day.key, entry.id)}
                                sx={{
                                  color: isDarkMode ? "#e8edf3" : accent,
                                  backgroundColor: isDarkMode
                                    ? "rgba(255, 255, 255, 0.04)"
                                    : "rgba(31, 111, 235, 0.06)",
                                  border: isDarkMode
                                    ? "1px solid rgba(255,255,255,0.08)"
                                    : "1px solid rgba(31, 111, 235, 0.10)",
                                  width: 42,
                                  height: 42,
                                  borderRadius: "12px",
                                  "&:hover": {
                                    backgroundColor: isDarkMode
                                      ? "rgba(229, 62, 62, 0.14)"
                                      : "rgba(229, 62, 62, 0.08)",
                                    color: "#e53e3e",
                                  },
                                }}
                              >
                                <DeleteOutlineIcon />
                              </IconButton>
                              <IconButton
                                aria-label="Move up"
                                onClick={() =>
                                  moveExerciseUp(day.key, entry.id)
                                }
                                sx={{
                                  display: reorderMode ? "flex" : "none",
                                  color: isDarkMode ? "#eef4fb" : accent,
                                  backgroundColor: isDarkMode
                                    ? "rgba(255, 255, 255, 0.04)"
                                    : "rgba(31, 111, 235, 0.06)",
                                  border: isDarkMode
                                    ? "1px solid rgba(255,255,255,0.08)"
                                    : "1px solid rgba(31, 111, 235, 0.10)",
                                  width: 42,
                                  height: 42,
                                  borderRadius: "12px",
                                  "&:hover": {
                                    backgroundColor: isDarkMode
                                      ? "rgba(31, 111, 235, 0.14)"
                                      : "rgba(31, 111, 235, 0.08)",
                                    color: accent,
                                  },
                                }}
                              >
                                <ArrowUpwardIcon />
                              </IconButton>
                              <IconButton
                                aria-label="Move down"
                                onClick={() =>
                                  moveExerciseDown(day.key, entry.id)
                                }
                                sx={{
                                  display: reorderMode ? "flex" : "none",
                                  color: isDarkMode ? "#eef4fb" : accent,
                                  backgroundColor: isDarkMode
                                    ? "rgba(255, 255, 255, 0.04)"
                                    : "rgba(31, 111, 235, 0.06)",
                                  border: isDarkMode
                                    ? "1px solid rgba(255,255,255,0.08)"
                                    : "1px solid rgba(31, 111, 235, 0.10)",
                                  width: 42,
                                  height: 42,
                                  borderRadius: "12px",
                                  "&:hover": {
                                    backgroundColor: isDarkMode
                                      ? "rgba(31, 111, 235, 0.14)"
                                      : "rgba(31, 111, 235, 0.08)",
                                    color: accent,
                                  },
                                }}
                              >
                                <ArrowDownwardIcon />
                              </IconButton>
                              <IconButton
                                aria-label="Move to day"
                                onClick={(e) => {
                                  setMoveMenuAnchor(e.currentTarget);
                                  setMoveMenuEntryId(entry.id);
                                  setMoveMenuDay(day.key);
                                }}
                                sx={{
                                  display: isMobile ? "flex" : "none",
                                  color: isDarkMode ? "#eef4fb" : accent,
                                  backgroundColor: isDarkMode
                                    ? "rgba(255, 255, 255, 0.04)"
                                    : "rgba(31, 111, 235, 0.06)",
                                  border: isDarkMode
                                    ? "1px solid rgba(255,255,255,0.08)"
                                    : "1px solid rgba(31, 111, 235, 0.10)",
                                  width: 42,
                                  height: 42,
                                  borderRadius: "12px",
                                  "&:hover": {
                                    backgroundColor: isDarkMode
                                      ? "rgba(31, 111, 235, 0.14)"
                                      : "rgba(31, 111, 235, 0.08)",
                                    color: accent,
                                  },
                                }}
                              >
                                <ArrowForwardIcon />
                              </IconButton>
                            </Stack>
                            <Menu
                              anchorEl={
                                moveMenuEntryId === entry.id
                                  ? moveMenuAnchor
                                  : null
                              }
                              open={
                                moveMenuEntryId === entry.id &&
                                Boolean(moveMenuAnchor)
                              }
                              onClose={() => {
                                setMoveMenuAnchor(null);
                                setMoveMenuEntryId(null);
                                setMoveMenuDay(null);
                              }}
                            >
                              {dayOptions.map((dayOpt) => (
                                <MenuItem
                                  key={dayOpt.key}
                                  onClick={() =>
                                    moveEntryToDay(
                                      day.key,
                                      entry.id,
                                      dayOpt.key,
                                    )
                                  }
                                  disabled={dayOpt.key === day.key}
                                >
                                  {dayOpt.label}
                                </MenuItem>
                              ))}
                            </Menu>
                          </Stack>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Stack>
    </Box>
  );
};

export default WorkoutPlanner;
