import React, { useContext } from "react";
import { Box, Stack, Typography, Button } from "@mui/material";
import { useTranslation, Trans } from "react-i18next"; // ovo je za koristenjke </br> jer u i18n nema te mogucnosti, koristimo break u naslovui herobannera tamo onaj tekst
import { AppContext } from "../AppContext";
const HeroBannerImage = "/images/banner.jpg";
const HeroBanner = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useContext(AppContext);
  // Always use the same banner image in both light and dark mode
  const bannerImage = HeroBannerImage;

  return (
    <Box
      sx={{
        mt: { lg: "212px", xs: "70px" },
        display: { xs: "none", sm: "block" },
      }}
      position="relative"
      padding="20px"
    >
      <Typography color="#FF2625" fontWeight="600" fontSize="26px">
        {t("heroBanner.fitnessClub")}
      </Typography>
      <Typography
        fontWeight={700}
        sx={{ fontSize: { lg: "44px", xs: "40px" } }}
        marginBottom="23px"
        mt="30px"
      >
        <Trans i18nKey="heroBanner.title" components={{ br: <br /> }} />
      </Typography>
      <Typography fontSize="22px" lineHeight="35px" marginBottom={4}>
        {t("heroBanner.subtitle")}
      </Typography>
      <Button
        variant="contained"
        color="error"
        href="#exercises"
        sx={{ backgroundColor: "#FF2625", padding: "10px" }}
      >
        {t("heroBanner.button")}
      </Button>
      <Typography
        fontWeight={600}
        color="#FF2625"
        sx={{ opacity: 0.1, display: { md: "block", xs: "none" } }}
        fontSize="200px"
      >
        {t("heroBanner.watermark")}
      </Typography>
      <img src={bannerImage} alt="banner" className="hero-banner-img" />
    </Box>
  );
};

export default HeroBanner;
