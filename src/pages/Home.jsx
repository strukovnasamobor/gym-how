import React, { useEffect, useState, useContext } from "react";
import { Box } from "@mui/material";
import { useLocation } from "react-router-dom";

import { AppContext } from "../AppContext";
import HeroBanner from "../components/HeroBanner";
import SearchExercises from "../components/SearchExercises";
import Exercises from "../components/Exercises";

const Home = () => {
  const [bodyPart, setBodyPart] = useState("all");
  const [detailFilter, setDetailFilter] = useState({
    type: "bodyPart",
    value: "all",
  });
  const { exercises, setExercises } = useContext(AppContext);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const selectedBodyPart = params.get("bodyPart");
    const selectedTarget = params.get("target");
    const selectedEquipment = params.get("equipment");

    if (selectedBodyPart) {
      setBodyPart(selectedBodyPart);
      setDetailFilter({ type: "bodyPart", value: selectedBodyPart });
      return;
    }

    if (selectedTarget) {
      setBodyPart("all");
      setDetailFilter({ type: "target", value: selectedTarget });
      return;
    }

    if (selectedEquipment) {
      setBodyPart("all");
      setDetailFilter({ type: "equipment", value: selectedEquipment });
      return;
    }

    setBodyPart("all");
    setDetailFilter({ type: "bodyPart", value: "all" });
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (!params.get("bodyPart") && !params.get("target") && !params.get("equipment")) return;

    const timeoutId = setTimeout(() => {
      const exercisesSection = document.getElementById("exercises");
      if (exercisesSection) {
        exercisesSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [location.search]);

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: "1488px",
        mx: "auto",
        px: { xs: 2, sm: 4, lg: 6 },
      }}
    >
      <HeroBanner />
      <SearchExercises
        setExercises={setExercises}
        bodyPart={bodyPart}
        setBodyPart={setBodyPart}
        setDetailFilter={setDetailFilter}
      />
      <Exercises
        exercises={exercises}
        setExercises={setExercises}
        bodyPart={bodyPart}
        detailFilter={detailFilter}
        setDetailFilter={setDetailFilter}
      />
    </Box>
  );
};

export default Home;
