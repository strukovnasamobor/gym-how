import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { useTranslation, Trans } from "react-i18next";

const ExerciseVideos = ({ exerciseVideos, name }) => {
  const { t } = useTranslation();
  console.log({ exerciseVideos });
  if (!exerciseVideos.length) return t("exerciseVideos.loading");

  return (
    <Box
      sx={{
        marginTop: { lg: "200px", xs: "20px" },
        marginBottom: { lg: "60px", xs: "36px" },
      }}
      padding="20px"
    >
      <Typography variant="h3" marginBottom="33px">
        <Trans
          i18nKey="exerciseVideos.title"
          values={{ name }}
          components={{
            highlight: (
              <span style={{ color: "#ff2625", textTransform: "capitalize" }} />
            ),
          }}
        />
      </Typography>
      <Stack
        justifyContent="flex-start"
        flexWrap="wrap"
        alignItems="center"
        sx={{
          flexDirection: { lg: "row", xs: "column" },
          gap: { lg: "110px", xs: "0" },
        }}
      >
        {exerciseVideos?.slice(0, 3).map((item, index) => (
          <a
            key={index}
            className="exercise-video"
            href={`https://www.youtube.com/watch?v=${item.video.videoId}`}
            target="blank"
            rel="noreffer"
          >
            <img src={item.video.thumbnails[0].url} alt={item.video.title} />
            <Box>
              <Typography variant="h5" color="#000">
                {item.video.title}
              </Typography>
              <Typography variant="h6" color="#000">
                {item.video.channelName}
              </Typography>
            </Box>
          </a>
        ))}
      </Stack>
    </Box>
  );
};

export default ExerciseVideos;

// u 23. liniji određujemo koliko videa želimo prikazati, u ovom slučaju 3
// ako želimo prikazati više onda slice(0, 5) i tako dalje, a ako želimo prikazati sve onda samo map bez slice-a
