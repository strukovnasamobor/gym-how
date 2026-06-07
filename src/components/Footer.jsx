import React, { useContext } from "react";
import { Box, Stack, Typography, useMediaQuery } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import FitnessCenterOutlinedIcon from "@mui/icons-material/FitnessCenterOutlined";
import SportsGymnasticsOutlinedIcon from "@mui/icons-material/SportsGymnasticsOutlined";
import { AppContext } from "../AppContext";

const Footer = () => {
  const location = useLocation();
  const { isDarkMode } = useContext(AppContext);
  const showMobileFooter = useMediaQuery("(max-width:1199.95px)");

  if (!showMobileFooter) {
    return null;
  }

  const tabs = [
    {
      label: "Profile",
      path: "/Profile",
      isActive: location.pathname === "/Profile",
      icon: PersonOutlineOutlinedIcon,
    },
    /*{
      label: "History",
      path: "/History",
      isActive: location.pathname === "/History",
      icon: HistoryOutlinedIcon,
    },*/
    {
      label: "Home",
      path: "/",
      isActive: location.pathname === "/",
      icon: FitnessCenterOutlinedIcon,
    },
    {
      label: "Exercises",
      path: "/Exercises",
      isActive: location.pathname === "/Exercises",
      icon: SportsGymnasticsOutlinedIcon,
    },
  ];

  return (
    <>
      <Box sx={{ height: "calc(84px + env(safe-area-inset-bottom))" }} />
      <Stack
        direction="row"
        justifyContent="space-around"
        alignItems="center"
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: "calc(84px + env(safe-area-inset-bottom))",
          px: 1,
          pt: "8px",
          pb: "calc(8px + env(safe-area-inset-bottom))",
          background: isDarkMode
            ? "#0e0d0d"
            : "linear-gradient(180deg, #ffffff 0%, #fff3f4 100%)",
          borderTop: isDarkMode ? "1px solid #262626" : "1px solid #f3d7da",
          boxShadow: isDarkMode
            ? "0 -8px 20px rgba(0, 0, 0, 0.35)"
            : "0 -8px 20px rgba(255, 38, 37, 0.08)",
          zIndex: 1200,
        }}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <Link
              key={tab.label}
              to={tab.path}
              style={{ textDecoration: "none", color: "inherit", flex: 1 }}
            >
              <Stack
                alignItems="center"
                justifyContent="center"
                spacing={0.4}
                sx={{
                  color: tab.isActive
                    ? isDarkMode
                      ? "#58d6ff"
                      : "#FF2625"
                    : isDarkMode
                      ? "#d1d1d1"
                      : "#6f5d5d",
                  minHeight: "60px",
                  borderRadius: "14px",
                  transition: "all 0.2s ease",
                  backgroundColor: tab.isActive
                    ? isDarkMode
                      ? "rgba(88, 214, 255, 0.16)"
                      : "rgba(255, 38, 37, 0.1)"
                    : "transparent",
                }}
              >
                <Icon sx={{ fontSize: "24px" }} />
                <Typography sx={{ fontSize: "12px", fontWeight: 700 }}>
                  {tab.label}
                </Typography>
              </Stack>
            </Link>
          );
        })}
      </Stack>
    </>
  );
};

export default Footer;
