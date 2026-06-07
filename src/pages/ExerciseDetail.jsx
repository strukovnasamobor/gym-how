import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";

import {
  EXERCISES_CACHE_KEY,
  fetchAllExercises,
  fetchData,
  findExerciseById,
  readCachedJson,
  writeCachedJson,
  youtubeOptions,
} from "../utils/fetchData";
import Detail from "../components/Detail";
import ExerciseVideos from "../components/ExerciseVideos";
import SimilarExercises from "../components/SimilarExercises";

const ExerciseDetail = () => {
  const [exerciseDetail, setExerciseDetail] = useState({}); //prazno polje/objekt
  const [exerciseVideos, setExerciseVideos] = useState([]); //prazan niz
  const [targetMuscleExercises, setTargetMuscleExercises] = useState([]);
  const [equipmentMuscleExercises, setEquipmentMuscleExercises] = useState([]);
  const { id } = useParams();

  useEffect(() => {
    const fetchExercisesData = async () => {
      const youtubeSearchUrl =
        "https://youtube-search-and-download.p.rapidapi.com";

      const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, []);
      const allExercises =
        Array.isArray(cachedExercises) && cachedExercises.length > 0
          ? cachedExercises
          : await fetchAllExercises();

      if (Array.isArray(allExercises) && allExercises.length > 0) {
        writeCachedJson(EXERCISES_CACHE_KEY, allExercises);
      }

      const exerciseDetailData = findExerciseById(allExercises, id);

      if (!exerciseDetailData) {
        setExerciseDetail({});
        setExerciseVideos([]);
        setTargetMuscleExercises([]);
        setEquipmentMuscleExercises([]);
        return;
      }

      setExerciseDetail(exerciseDetailData);

      const exerciseVideosData = await fetchData(
        `${youtubeSearchUrl}/search?query=${exerciseDetailData.name}`,
        youtubeOptions,
      );
      setExerciseVideos(
        Array.isArray(exerciseVideosData?.contents)
          ? exerciseVideosData.contents
          : [],
      );

      const targetMuscleExercisesData = Array.isArray(allExercises)
        ? allExercises.filter(
            (exercise) =>
              exercise.id !== exerciseDetailData.id &&
              String(exercise?.target || "") ===
                String(exerciseDetailData?.target || ""),
          )
        : [];
      setTargetMuscleExercises(
        Array.isArray(targetMuscleExercisesData)
          ? targetMuscleExercisesData
          : [],
      );

      const equipmentMuscleExercisesData = Array.isArray(allExercises)
        ? allExercises.filter(
            (exercise) =>
              exercise.id !== exerciseDetailData.id &&
              String(exercise?.equipment || "") ===
                String(exerciseDetailData?.equipment || ""),
          )
        : [];
      setEquipmentMuscleExercises(
        Array.isArray(equipmentMuscleExercisesData)
          ? equipmentMuscleExercisesData
          : [],
      );
    };

    fetchExercisesData();
  }, [id]);

  return (
    <Box sx={{ pb: { lg: "140px", xs: "120px" } }}>
      <Detail exerciseDetail={exerciseDetail} />
      <ExerciseVideos
        exerciseVideos={exerciseVideos}
        name={exerciseDetail.name}
      />
      <SimilarExercises
        targetMuscleExercises={targetMuscleExercises}
        equipmentMuscleExercises={equipmentMuscleExercises}
      />
    </Box>
  );
};

export default ExerciseDetail;
