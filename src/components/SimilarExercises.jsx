import React from "react";
import { Box, Stack, Typography } from "@mui/material";

import HorizontalScrollbar from "./HorizontalScrollbar";
import Loader from "./Loader";
import { useTranslation } from "react-i18next";

const SimilarExercises = ({
  targetMuscleExercises,
  equipmentMuscleExercises,
}) => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        marginTop: { lg: "100px", xs: "0" },
        mb: { lg: "80px", xs: "90px" },
      }}
    >
      <Typography variant="h3" marginBottom={5}>
        {t("similarExercises.targetSameMuscleGroup")}
      </Typography>
      <Stack direction="row" sx={{ padding: "2", position: "relative" }}>
        {targetMuscleExercises.length ? (
          <HorizontalScrollbar data={targetMuscleExercises} />
        ) : (
          <Loader />
        )}
      </Stack>
      <Typography variant="h3" marginBottom={5} marginTop={5}>
        {t("similarExercises.exercisesSameEquipment")}
      </Typography>
      <Stack direction="row" sx={{ padding: "2", position: "relative" }}>
        {equipmentMuscleExercises.length ? (
          <HorizontalScrollbar data={equipmentMuscleExercises} />
        ) : (
          <Loader /> //smolec was here
        )}
      </Stack>
    </Box>
  );
};

export default SimilarExercises;
