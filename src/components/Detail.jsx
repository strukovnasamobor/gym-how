import React, { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AppContext } from "../AppContext";

const BodyPartImage = "/images/body-part.png";
const TargetImage = "/images/target.png";
const EquipmentImage = "/images/equipment.png";
import FavoriteIcon from "@mui/icons-material/Favorite";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import { useTranslation } from "react-i18next";
const placeholder = "/images/placeholder.png";
import ExerciseImage from "./ExerciseImage";

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

const getTodayKey = () => {
  const dayIndex = new Date().getDay();
  const normalizedIndex = (dayIndex + 6) % 7;
  return DAY_KEYS[normalizedIndex] || "monday";
};

const Detail = ({ exerciseDetail }) => {
  const navigate = useNavigate();
  const { bodyPart, name, target, equipment, id, instructions } =
    exerciseDetail;
  const displayName =
    typeof name === "string" && name.length > 0
      ? name.charAt(0).toUpperCase() + name.slice(1)
      : name;
  const { favorites, toggleFavorite, user } = useContext(AppContext);
  const isUserLoggedIn = user !== null;
  const isFavorite = isUserLoggedIn && favorites.includes(id);
  const { t } = useTranslation();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [planDay, setPlanDay] = useState(getTodayKey);
  const [planToastOpen, setPlanToastOpen] = useState(false);

  const dayOptions = useMemo(
    () =>
      DAY_KEYS.map((key) => ({
        key,
        label: t(`planner.days.${key}`),
      })),
    [t],
  );

  const instructionDescription = Array.isArray(instructions)
    ? instructions
        .filter((item) => typeof item === "string" && item.trim())
        .slice(0, 2)
        .join(" ")
    : "";

  const descriptionVariantIndex =
    Array.from(String(id || "")).reduce(
      (sum, character) => sum + character.charCodeAt(0),
      0,
    ) % 4;

  const dynamicDescription = t(
    `detail.dynamicDescriptions.${descriptionVariantIndex}`,
    {
      name: displayName,
      target,
      equipment,
      bodyPart,
      defaultValue: t("detail.description", { name: displayName, target }),
    },
  );

  const exerciseDescription = instructionDescription
    ? t("detail.instructionsPrefix", {
        name: displayName,
        instructions: instructionDescription,
      })
    : dynamicDescription;

  const extraDetail = [
    {
      icon: BodyPartImage,
      name: bodyPart,
      onClick: () => {
        navigate(`/?bodyPart=${encodeURIComponent(bodyPart)}`);
      },
    },
    {
      icon: TargetImage,
      name: target,
      onClick: () => {
        navigate(`/?target=${encodeURIComponent(target)}`);
      },
    },
    {
      icon: EquipmentImage,
      name: equipment,
      onClick: () => {
        navigate(`/?equipment=${encodeURIComponent(equipment)}`);
      },
    },
    {
      icon: FavoriteIcon,
      iconSize: 42,
      iconColor: !isUserLoggedIn
        ? "#cccccc"
        : isFavorite
          ? "#e53935"
          : "#9e9e9e",
      name: isFavorite
        ? t("detail.removeFromFavorite")
        : t("detail.addToFavorite"),
      onClick: () => {
        if (isUserLoggedIn) {
          toggleFavorite(id);
        }
      },
      disabled: !isUserLoggedIn,
    },
    {
      icon: CalendarMonthOutlinedIcon,
      iconSize: 42,
      iconColor: !isUserLoggedIn ? "#cccccc" : "#1f6feb",
      name: t("detail.addToPlan"),
      onClick: () => {
        if (!isUserLoggedIn) {
          return;
        }

        setPlanDay(getTodayKey());
        setPlanDialogOpen(true);
      },
      disabled: !isUserLoggedIn,
    },
  ];

  const handleClosePlanDialog = () => {
    setPlanDialogOpen(false);
  };

  const handleConfirmAddToPlan = () => {
    if (!isUserLoggedIn) {
      return;
    }

    const pendingPayload = {
      id: `${String(exerciseDetail?.id || "exercise")}-${Date.now()}`,
      dayKey: planDay,
      exercise: exerciseDetail,
    };

    try {
      localStorage.setItem(
        PENDING_PLAN_ADD_KEY,
        JSON.stringify(pendingPayload),
      );
    } catch (error) {
      console.warn("Failed to store pending plan add:", error);
    }

    window.dispatchEvent(
      new CustomEvent("gymhow-add-to-plan", {
        detail: {
          exercise: exerciseDetail,
          dayKey: planDay,
          pendingId: pendingPayload.id,
        },
      }),
    );

    setPlanDialogOpen(false);
    setPlanToastOpen(true);

    const plannerNode = document.getElementById("workout-planner");
    if (plannerNode) {
      plannerNode.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      <Stack
        gap="60px"
        sx={{
          flexDirection: { lg: "row" },
          padding: "20px",
          alignItems: "center",
        }}
      >
        <ExerciseImage
          exercise={exerciseDetail}
          fallbackSrc={placeholder}
          alt={displayName}
          className="detail-image"
        />
        <Stack sx={{ gap: { lg: "35px", xs: "20px" } }}>
          <Typography variant="h3">{displayName}</Typography>
          <Typography variant="h6">{exerciseDescription}</Typography>
          {extraDetail.map((item) => (
            <Stack
              key={item.name}
              direction="row"
              gap="24px"
              alignItems="center"
            >
              <Button
                onClick={item.onClick}
                disabled={item.disabled || false}
                sx={{
                  background: item.disabled ? "#f0f0f0" : "#fff2db",
                  borderRadius: "50%",
                  width: "100px",
                  height: "100px",
                  minWidth: "100px",
                  padding: 0,
                  flex: "0 0 100px",
                  cursor: item.disabled ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: item.disabled ? 0.6 : 1,
                  "&:hover": !item.disabled
                    ? {
                        transform: "scale(1.08)",
                        boxShadow: "0 8px 20px rgba(0, 0, 0, 0.15)",
                      }
                    : {},
                }}
              >
                {typeof item.icon === "string" ? (
                  <img
                    src={item.icon}
                    alt={bodyPart}
                    style={{ width: "50px", height: "50px" }}
                  />
                ) : (
                  <item.icon
                    sx={{
                      fontSize: item.iconSize || 50,
                      width: item.iconSize || 50,
                      height: item.iconSize || 50,
                      lineHeight: 1,
                      color: item.iconColor || "inherit",
                    }}
                  />
                )}
              </Button>
              <Typography
                textTransform="capitalize"
                variant="h5"
                sx={{
                  color: item.disabled ? "#999999" : "inherit",
                  opacity: item.disabled ? 0.7 : 1,
                }}
              >
                {item.name}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Stack>

      <Dialog
        open={planDialogOpen}
        onClose={handleClosePlanDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{t("detail.chooseDayTitle")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {t("detail.chooseDayHelp")}
            </Typography>
            <TextField
              select
              label={t("planner.form.day")}
              value={planDay}
              onChange={(event) => setPlanDay(event.target.value)}
              sx={{
                "& .MuiOutlinedInput-input": {
                  color: "#111",
                },
                "body.dark & .MuiOutlinedInput-input": {
                  color: "#fff",
                },
              }}
            >
              {dayOptions.map((day) => (
                <MenuItem key={day.key} value={day.key}>
                  {day.label}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClosePlanDialog}>{t("detail.cancel")}</Button>
          <Button variant="contained" onClick={handleConfirmAddToPlan}>
            {t("detail.confirmAdd")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={planToastOpen}
        autoHideDuration={2600}
        onClose={() => setPlanToastOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setPlanToastOpen(false)}
          severity="success"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {t("detail.addedToPlanMessage")}
        </Alert>
      </Snackbar>
    </>
  );
};

export default Detail;
