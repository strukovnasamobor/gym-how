import React, { useContext } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { AppContext } from "../AppContext";

const Icon = "/images/gym.png";
const All = "/images/bodyParts/FullBody.png";
const Back = "/images/bodyParts/back.png";
const Cardio = "/images/bodyParts/cardio.png";
const Chest = "/images/bodyParts/chest.png";
const LowerArms = "/images/bodyParts/lowerArms.png";
const LowerLegs = "/images/bodyParts/lowerLegs.png";
const Neck = "/images/bodyParts/neck.png";
const Shoulders = "/images/bodyParts/shoulders.png";
const UpperArms = "/images/bodyParts/upperArms.png";
const UpperLegs = "/images/bodyParts/upperLegs.png";
const Waist = "/images/bodyParts/waist.png";
import { useTranslation } from "react-i18next";

const BodyPart = ({ item, setBodyPart, bodyPart, compact = false, setDetailFilter }) => {
  const { t } = useTranslation();
  const { isDarkMode } = useContext(AppContext);
  return (
    <Stack
      type="button"
      alignItems="center"
      justifyContent="center"
      className="bodyPart-card"
      sx={{
        borderTop: bodyPart === item ? "4px solid #ff2625" : "",
        background: "#fff",
        borderBottomLeftRadius: "20px",
        width: compact
          ? { xs: "236px", sm: "258px", md: "270px" }
          : { xs: "220px", sm: "248px", md: "270px" },
        height: compact
          ? { xs: "248px", sm: "266px", md: "280px" }
          : { xs: "230px", sm: "255px", md: "280px" },
        cursor: "pointer",
        gap: compact
          ? { xs: "30px", sm: "36px", md: "47px" }
          : { xs: "26px", sm: "34px", md: "47px" },
      }}
      onClick={() => {
        setBodyPart(item);
        if (setDetailFilter) {
          setDetailFilter({ type: "bodyPart", value: item });
        }
        const el = document.getElementById("exercises");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        else window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      <Box
        sx={{
          width: compact
            ? { xs: "86px", sm: "94px", md: "96px" }
            : { xs: "78px", sm: "88px", md: "96px" },
          height: compact
            ? { xs: "86px", sm: "94px", md: "96px" }
            : { xs: "78px", sm: "88px", md: "96px" },
          borderRadius: "50%",
          backgroundColor: isDarkMode ? "#ffffff" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={
            item === "all"
              ? All
              : item === "back"
                ? Back
                : item === "cardio"
                  ? Cardio
                  : item === "chest"
                    ? Chest
                    : item === "lower arms"
                      ? LowerArms
                      : item === "lower legs"
                        ? LowerLegs
                        : item === "neck"
                          ? Neck
                          : item === "shoulders"
                            ? Shoulders
                            : item === "upper arms"
                              ? UpperArms
                              : item === "upper legs"
                                ? UpperLegs
                                : Waist
          } //ako je item all onda se stavi All, ako je back onda se stavi Back itd.
          alt={item}
          style={{ width: compact ? "62px" : "56px", height: compact ? "62px" : "56px" }}
        />
      </Box>
      <Typography
        fontSize={{ xs: "20px", sm: "22px", md: "24px" }}
        fontWeight="bold"
        color="#3A1212"
        textTransform="capitalize"
      >
        {t(`bodyParts.${item}`, item)}
      </Typography>
    </Stack>
  );
};

export default BodyPart;
