import React from "react";
import { Link } from "react-router-dom";
import { Button, Stack, Typography } from "@mui/material/";
import { useTranslation } from "react-i18next";

const placeholder = "/images/placeholder.png";
import ExerciseImage from "./ExerciseImage";
import { getExerciseBodyParts } from "../utils/fetchData";

const ExerciseCard = ({ exercise }) => {
  const { t } = useTranslation();
  const bodyParts = getExerciseBodyParts(exercise).slice(0, 2);

  return (
    <Link className="exercise-card" to={`/exercise/${exercise.id}`}>
      <ExerciseImage
        exercise={exercise}
        fallbackSrc={placeholder}
        alt={exercise.name}
      />
      <Stack direction="row">
        {bodyParts.map((part, index) => (
          <Button
            key={part}
            sx={{
              ml: index === 0 ? "21px" : "8px",
              color: "#fff",
              background: "#ffa9a9",
              fontSize: "14px",
              borderRadius: "20px",
              textTransform: "capitalize",
            }}
          >
            {part}
          </Button>
        ))}
        <Button
          sx={{
            ml: "21px",
            color: "#fff",
            background: "#fcc757",
            fontSize: "14px",
            borderRadius: "20px",
            textTransform: "capitalize",
          }}
        >
          {exercise.target}
        </Button>
      </Stack>
      <Typography
        className="exercise-card-name-text"
        marginLeft="21px"
        fontWeight="bold"
        mt="11px"
        pb="10px"
        textTransform="capitalize"
        fontSize="22px"
        sx={{ color: "#000 !important" }}
      >
        {exercise.name}
      </Typography>
    </Link>
  );
};

export default ExerciseCard;

// možemo platiti 12€ mjesečno da otključamo GIF-ove
// to možemo tipa u 5.mjesecu ili 6.mjesecu platit, ali dotad možemo kao placeholder staviti slike neke
// ono in case of failure dode placeholder
// onError={(e) => { e.target.src = '/placeholder.png' }}
//   <img src={exercise.gifUrl} alt={exercise.name} loading="lazy" onError={(e) => { e.target.src = '/placeholder.png' }} />
// naravno slike moramo onda dodati u neki folder mozemo ga nazvat "placeholder" u "assets"

// ne radi placeholder tako da moramo umjesto exercise.gifUrl stavit placeholder.png, ali onda nećemo imat slike vježbi nego samo placeholder, ali bar će bit nešto
// kasnije to onda samo zamijenimo i bok
// na 11.liniji <img src={exercise.gifUrl} alt={exercise.name} loading="lazy" />
// za placeholder: <img src={placeholder} alt={exercise.name} loading="lazy" />
