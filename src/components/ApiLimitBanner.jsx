import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { API_RATE_LIMIT_UNTIL_KEY } from "../utils/fetchData";

const ApiLimitBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    const updateVisibility = () => {
      try {
        const rawValue = localStorage.getItem(API_RATE_LIMIT_UNTIL_KEY);
        const untilTimestamp = Number(rawValue || 0);
        setIsVisible(untilTimestamp > Date.now());
      } catch {
        setIsVisible(false);
      }
    };

    const handleRateLimitEvent = () => {
      updateVisibility();
    };

    updateVisibility();
    window.addEventListener("gymhow-api-rate-limit", handleRateLimitEvent);
    const intervalId = window.setInterval(updateVisibility, 5000);

    return () => {
      window.removeEventListener("gymhow-api-rate-limit", handleRateLimitEvent);
      window.clearInterval(intervalId);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Box
      sx={{
        mx: { xs: 1.5, sm: 2 },
        mt: 1,
        px: 2,
        py: 1.2,
        borderRadius: "10px",
        backgroundColor: "#fff4e5",
        border: "1px solid #ffd39c",
      }}
    >
      <Typography sx={{ fontWeight: 700, color: "#8a3b00", fontSize: "14px" }}>
        {t("apiLimit.title")}
      </Typography>
      <Typography sx={{ color: "#8a3b00", fontSize: "13px" }}>
        {t("apiLimit.message")}
      </Typography>
    </Box>
  );
};

export default ApiLimitBanner;
