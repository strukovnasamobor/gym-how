import { useRef, useState, useEffect, useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Box, Stack, Typography, useMediaQuery } from "@mui/material"; //služi za organizaciju elemenata u stacku, može biti horizontalno ili vertikalno
import { useTranslation } from "react-i18next"; //služi za prevođenje teksta na različite jezike
import SettingsIcon from "@mui/icons-material/Settings";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import FilterListOutlinedIcon from "@mui/icons-material/FilterListOutlined";
import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SportsGymnasticsOutlinedIcon from "@mui/icons-material/SportsGymnasticsOutlined";

import { AppContext } from "../AppContext";
import {
  BODYPARTS_CACHE_KEY,
  EXERCISES_CACHE_KEY,
  fetchAllExercises,
  filterExercisesByQuery,
  getBodyPartsFromExercises,
  readCachedJson,
  writeCachedJson,
} from "../utils/fetchData";

const Navbar = () => {
  const dropDownMenuRef = useRef(null);
  const [isDropDownMenuOpen, setIsDropDownMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [bodyPartOptions, setBodyPartOptions] = useState(["all"]);
  const {
    isDarkMode,
    setIsDarkMode,
    setExercises,
    exerciseSortOrder,
    setExerciseSortOrder,
  } = useContext(AppContext);
  const { i18n, t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const showDesktopNav = useMediaQuery("(min-width:1200px)");

  const isHomePage = location.pathname === "/";
  const isProfilePage = location.pathname === "/Profile";
  const isExercisesPage =
    location.pathname === "/Exercises" ||
    location.pathname.startsWith("/exercise/");

  const pageTitle = isProfilePage
    ? t("navbar.profile")
    : isExercisesPage
      ? t("navbar.exercises")
      : t("navbar.home");

  const selectedBodyParts = (() => {
    const params = new URLSearchParams(location.search);
    const multiValue = (params.get("bodyParts") || "").trim().toLowerCase();

    if (multiValue) {
      return Array.from(
        new Set(
          multiValue
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        ),
      );
    }

    const legacyValue = (params.get("bodyPart") || "").trim().toLowerCase();
    if (legacyValue && legacyValue !== "all") {
      return [legacyValue];
    }

    return [];
  })();
  const isAllBodyPartsSelected = selectedBodyParts.length === 0;

  const desktopTabs = [
    {
      label: t("navbar.home"),
      path: "/",
      isActive: isHomePage,
      icon: HomeOutlinedIcon,
    },
    {
      label: t("navbar.exercises"),
      path: "/Exercises",
      isActive: isExercisesPage,
      icon: SportsGymnasticsOutlinedIcon,
    },
    {
      label: t("navbar.profile"),
      path: "/Profile",
      isActive: isProfilePage,
      icon: PersonOutlineOutlinedIcon,
    },
  ];

  const navBackground = isProfilePage
    ? isDarkMode
      ? "linear-gradient(180deg, #3f8b31 0%, #111111 100%)"
      : "linear-gradient(180deg, #5ebb4c 0%, #ffffff 100%)"
    : isExercisesPage
      ? isDarkMode
        ? "linear-gradient(180deg, #8f571d 0%, #111111 100%)"
        : "linear-gradient(180deg, #c77829 0%, #ffffff 100%)"
      : isDarkMode
        ? "linear-gradient(180deg, #6e131a 0%, #111111 100%)"
        : "linear-gradient(180deg, #a81b27 0%, #ffffff 100%)";

  // Shared theme-aware look for the neutral settings-menu buttons:
  // light mode -> white background + black text; dark mode -> dark background + white text.
  const menuButtonColors = {
    backgroundColor: isDarkMode ? "#020202" : "#fff",
    color: isDarkMode ? "#fff" : "#020202",
    border: isDarkMode
      ? "1px solid rgba(255, 255, 255, 0.14)"
      : "1px solid rgba(0, 0, 0, 0.12)",
  };

  function toggleDropDownMenu() {
    setIsDropDownMenuOpen((prevState) => !prevState);
  }

  function changeLanguage() {
    const current = (i18n.language || "").toLowerCase();
    i18n.changeLanguage(current.startsWith("hr") ? "en" : "hr");
  }

  function toggleDarkMode() {
    setIsDarkMode((prevMode) => !prevMode);
    localStorage.setItem("isDarkMode", !isDarkMode);
  }

  const clearSearch = () => {
    if (isExercisesPage) {
      navigate("/Exercises");
    } else {
      const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, []);
      if (Array.isArray(cachedExercises) && cachedExercises.length > 0) {
        setExercises(cachedExercises);
      }
      navigate("/");
    }

    setSearchInput("");
    setIsSearchOpen(false);
    setIsSortMenuOpen(false);
  };

  const handleSearch = async () => {
    const normalizedSearch = searchInput.trim().toLowerCase();

    if (!normalizedSearch) {
      clearSearch();
      return;
    }

    if (isExercisesPage) {
      navigate(`/Exercises?q=${encodeURIComponent(normalizedSearch)}`);
      setSearchInput("");
      setIsSearchOpen(false);
      setIsSortMenuOpen(false);
      return;
    }

    const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, []);

    if (Array.isArray(cachedExercises) && cachedExercises.length > 0) {
      const searchedExercises = filterExercisesByQuery(
        cachedExercises,
        normalizedSearch,
      );

      setExercises(searchedExercises);
      setSearchInput("");
      setIsSearchOpen(false);
      navigate("/");
      setTimeout(() => {
        const exercisesSection = document.getElementById("exercises");
        if (exercisesSection) {
          exercisesSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
      return;
    }

    try {
      const exercisesData = await fetchAllExercises();
      if (Array.isArray(exercisesData) && exercisesData.length > 0) {
        writeCachedJson(EXERCISES_CACHE_KEY, exercisesData);
      }
      const searchedExercises = filterExercisesByQuery(
        exercisesData,
        normalizedSearch,
      );

      setExercises(searchedExercises);
      setSearchInput("");
      setIsSearchOpen(false);
      navigate("/");
      setTimeout(() => {
        const exercisesSection = document.getElementById("exercises");
        if (exercisesSection) {
          exercisesSection.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        dropDownMenuRef.current &&
        !dropDownMenuRef.current.contains(event.target)
      ) {
        setIsDropDownMenuOpen(false);
        setIsSearchOpen(false);
        setIsSortMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const cachedBodyParts = readCachedJson(BODYPARTS_CACHE_KEY, null);
    if (Array.isArray(cachedBodyParts) && cachedBodyParts.length > 0) {
      setBodyPartOptions(["all", ...cachedBodyParts]);
      return;
    }

    const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, []);
    if (Array.isArray(cachedExercises) && cachedExercises.length > 0) {
      const derivedBodyParts = getBodyPartsFromExercises(cachedExercises);
      writeCachedJson(BODYPARTS_CACHE_KEY, derivedBodyParts);
      setBodyPartOptions(["all", ...derivedBodyParts]);
      return;
    }

    setBodyPartOptions(["all"]);
  }, []);

  const handleBodyPartFilterChange = (nextBodyPart) => {
    const params = new URLSearchParams(location.search);

    if (nextBodyPart === "all") {
      params.delete("bodyPart");
      params.delete("bodyParts");
    } else {
      const nextSelected = new Set(selectedBodyParts);

      if (nextSelected.has(nextBodyPart)) {
        nextSelected.delete(nextBodyPart);
      } else {
        nextSelected.add(nextBodyPart);
      }

      const normalizedSelection = Array.from(nextSelected).sort((a, b) =>
        a.localeCompare(b),
      );

      params.delete("bodyPart");
      if (normalizedSelection.length === 0) {
        params.delete("bodyParts");
      } else {
        params.set("bodyParts", normalizedSelection.join(","));
      }
    }

    const nextQueryString = params.toString();
    navigate(nextQueryString ? `/Exercises?${nextQueryString}` : "/Exercises");
  };

  return (
    <Box
      ref={dropDownMenuRef}
      sx={{
        position: "sticky",
        top: -1,
        pt: "1px",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        zIndex: 1300,
        background: navBackground,
      }}
    >
      <Stack
        direction="row"
        sx={{
          position: "relative",
          gap: { sm: "40px", xs: "16px" },
          justifyContent: "space-between",
          alignItems: "center",
          px: { sm: 3, xs: 2 },
          py: 1,
          borderRadius: "0 0 16px 16px",
          background: navBackground,
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}
        >
          {showDesktopNav ? (
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="flex-start"
              spacing={1.25}
              sx={{
                px: 0,
                py: 0,
                width: "fit-content",
                zIndex: 1,
              }}
            >
              {desktopTabs.map((tab) => (
                <Link
                  key={tab.label}
                  to={tab.path}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      minWidth: "132px",
                      px: 2,
                      py: 1.1,
                      borderRadius: "999px",
                      border: tab.isActive
                        ? isDarkMode
                          ? "1px solid rgba(255, 255, 255, 0.28)"
                          : "1px solid rgba(0, 0, 0, 0.16)"
                        : isDarkMode
                          ? "1px solid rgba(255, 255, 255, 0.14)"
                          : "1px solid rgba(0, 0, 0, 0.1)",
                      backgroundColor: tab.isActive
                        ? isDarkMode
                          ? "rgba(255, 255, 255, 0.16)"
                          : "rgba(0, 0, 0, 0.06)"
                        : isDarkMode
                          ? "rgba(255, 255, 255, 0.06)"
                          : "rgba(0, 0, 0, 0.03)",
                      color: isDarkMode ? "#fff" : "#000",
                      transition:
                        "transform 0.2s ease, background-color 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        backgroundColor: isDarkMode
                          ? "rgba(255, 255, 255, 0.18)"
                          : "rgba(0, 0, 0, 0.08)",
                      },
                    }}
                  >
                    <tab.icon sx={{ fontSize: "20px" }} />
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontWeight: tab.isActive ? 800 : 600,
                        color: "inherit",
                      }}
                    >
                      {tab.label}
                    </Typography>
                  </Stack>
                </Link>
              ))}
            </Stack>
          ) : (
            <Stack direction="column" spacing={0.1} alignItems="flex-start">
              <Typography
                sx={{
                  fontSize: { xs: "20px", sm: "24px" },
                  fontWeight: 800,
                  color: isDarkMode ? "#fff" : "#000",
                }}
              >
                {pageTitle}
              </Typography>
            </Stack>
          )}
        </Box>

        <Box
          sx={{
            position: "relative",
            marginLeft: "auto",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
          }}
        >
          {(isHomePage || isExercisesPage) && (
            <Stack direction="row" spacing={1} alignItems="center">
              {isExercisesPage && (
                <Box sx={{ position: "relative" }}>
                  <button
                    onClick={() => {
                      setIsSortMenuOpen((prev) => !prev);
                      setIsSearchOpen(false);
                    }}
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "none",
                      borderRadius: "10px",
                      backgroundColor: "#020202",
                      color: "#fff",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label={t("navbar.filter.sortExercises")}
                    title={`${t("navbar.filter.sort")}: ${
                      exerciseSortOrder === "az"
                        ? t("navbar.filter.ascendingAz")
                        : exerciseSortOrder === "za"
                          ? t("navbar.filter.descendingZa")
                          : t("navbar.filter.common")
                    }`}
                  >
                    <FilterListOutlinedIcon fontSize="small" />
                  </button>

                  {isSortMenuOpen && (
                    <Stack
                      direction="column"
                      sx={{
                        position: "absolute",
                        top: "46px",
                        right: 0,
                        backgroundColor: isDarkMode ? "#101215" : "#fff",
                        borderRadius: "10px",
                        boxShadow: isDarkMode
                          ? "0px 10px 24px rgba(0, 0, 0, 0.5)"
                          : "0px 6px 16px rgba(0, 0, 0, 0.15)",
                        border: isDarkMode
                          ? "1px solid rgba(255, 255, 255, 0.12)"
                          : "1px solid rgba(0, 0, 0, 0.08)",
                        p: "8px",
                        gap: "6px",
                        minWidth: "230px",
                        maxHeight: "360px",
                        overflowY: "auto",
                        zIndex: 10000,
                      }}
                    >
                      <Typography
                        sx={{
                          px: 1,
                          pt: 0.5,
                          pb: 0.5,
                          fontSize: "12px",
                          fontWeight: 700,
                          color: isDarkMode ? "#a7b0bb" : "#525252",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t("navbar.filter.sort")}
                      </Typography>

                      <button
                        onClick={() => {
                          setExerciseSortOrder("az");
                          setIsSortMenuOpen(false);
                        }}
                        style={{
                          height: "34px",
                          border: isDarkMode
                            ? "1px solid rgba(255, 255, 255, 0.08)"
                            : "1px solid rgba(0, 0, 0, 0.06)",
                          borderRadius: "8px",
                          backgroundColor:
                            exerciseSortOrder === "az"
                              ? isDarkMode
                                ? "rgba(255, 99, 99, 0.26)"
                                : "#ffe9e9"
                              : isDarkMode
                                ? "#161b22"
                                : "#f8f8f8",
                          color: isDarkMode ? "#f3f4f6" : "#1f1f1f",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: "0 10px",
                          fontSize: "14px",
                        }}
                      >
                        {t("navbar.filter.ascendingAz")}
                      </button>
                      <button
                        onClick={() => {
                          setExerciseSortOrder("za");
                          setIsSortMenuOpen(false);
                        }}
                        style={{
                          height: "34px",
                          border: isDarkMode
                            ? "1px solid rgba(255, 255, 255, 0.08)"
                            : "1px solid rgba(0, 0, 0, 0.06)",
                          borderRadius: "8px",
                          backgroundColor:
                            exerciseSortOrder === "za"
                              ? isDarkMode
                                ? "rgba(255, 99, 99, 0.26)"
                                : "#ffe9e9"
                              : isDarkMode
                                ? "#161b22"
                                : "#f8f8f8",
                          color: isDarkMode ? "#f3f4f6" : "#1f1f1f",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: "0 10px",
                          fontSize: "14px",
                        }}
                      >
                        {t("navbar.filter.descendingZa")}
                      </button>
                      <button
                        onClick={() => {
                          setExerciseSortOrder("common");
                          setIsSortMenuOpen(false);
                        }}
                        style={{
                          height: "34px",
                          border: isDarkMode
                            ? "1px solid rgba(255, 255, 255, 0.08)"
                            : "1px solid rgba(0, 0, 0, 0.06)",
                          borderRadius: "8px",
                          backgroundColor:
                            exerciseSortOrder === "common"
                              ? isDarkMode
                                ? "rgba(255, 99, 99, 0.26)"
                                : "#ffe9e9"
                              : isDarkMode
                                ? "#161b22"
                                : "#f8f8f8",
                          color: isDarkMode ? "#f3f4f6" : "#1f1f1f",
                          cursor: "pointer",
                          textAlign: "left",
                          padding: "0 10px",
                          fontSize: "14px",
                        }}
                      >
                        {t("navbar.filter.common")}
                      </button>

                      <Typography
                        sx={{
                          px: 1,
                          pt: 1,
                          pb: 0.5,
                          fontSize: "12px",
                          fontWeight: 700,
                          color: isDarkMode ? "#a7b0bb" : "#525252",
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {t("navbar.filter.bodyPart")}
                      </Typography>

                      {bodyPartOptions.map((bodyPart) => (
                        <label
                          key={bodyPart}
                          style={{
                            height: "34px",
                            borderRadius: "8px",
                            border: isDarkMode
                              ? "1px solid rgba(255, 255, 255, 0.08)"
                              : "1px solid rgba(0, 0, 0, 0.06)",
                            backgroundColor: (
                              bodyPart === "all"
                                ? isAllBodyPartsSelected
                                : selectedBodyParts.includes(bodyPart)
                            )
                              ? isDarkMode
                                ? "rgba(255, 99, 99, 0.26)"
                                : "#ffe9e9"
                              : isDarkMode
                                ? "#161b22"
                                : "#f8f8f8",
                            color: isDarkMode ? "#f3f4f6" : "#1f1f1f",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "0 10px",
                            textTransform: "capitalize",
                            fontSize: "14px",
                            fontWeight: (
                              bodyPart === "all"
                                ? isAllBodyPartsSelected
                                : selectedBodyParts.includes(bodyPart)
                            )
                              ? 700
                              : 500,
                            userSelect: "none",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={
                              bodyPart === "all"
                                ? isAllBodyPartsSelected
                                : selectedBodyParts.includes(bodyPart)
                            }
                            onChange={() =>
                              handleBodyPartFilterChange(bodyPart)
                            }
                            style={{
                              cursor: "pointer",
                              width: "15px",
                              height: "15px",
                              margin: 0,
                              accentColor: "#ff5a5a",
                              flexShrink: 0,
                            }}
                          />
                          {t(`bodyParts.${bodyPart}`, bodyPart)}
                        </label>
                      ))}
                    </Stack>
                  )}
                </Box>
              )}

              {!isHomePage && (
                <button
                  onClick={() => {
                    setIsSearchOpen((prev) => !prev);
                    setIsSortMenuOpen(false);
                  }}
                  style={{
                    width: "40px",
                    height: "40px",
                    border: "none",
                    borderRadius: "10px",
                    backgroundColor: "#020202",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <SearchOutlinedIcon />
                </button>
              )}
            </Stack>
          )}

          <button
            onClick={toggleDropDownMenu}
            style={{
              width: "40px",
              height: "40px",
              border: "none",
              borderRadius: "10px",
              backgroundColor: "#020202",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              marginLeft: "8px",
            }}
          >
            <SettingsIcon fontSize="small" sx={{ verticalAlign: "middle" }} />
          </button>
          {isDropDownMenuOpen && (
            <Stack
              className="profile-menu-surface"
              direction="column"
              sx={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: "8px",
                backgroundColor: "#fff",
                borderRadius: "8px",
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
                padding: "8px 0",
                minWidth: "180px",
                zIndex: 1000,
              }}
            >
              <button
                onClick={toggleDarkMode}
                style={{
                  margin: "4px 12px",
                  height: "40px",
                  width: "calc(100% - 24px)",
                  borderRadius: "8px",
                  ...menuButtonColors,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isDarkMode ? (
                  <DarkModeOutlinedIcon />
                ) : (
                  <LightModeOutlinedIcon />
                )}
                {isDarkMode ? t("navbar.theme.dark") : t("navbar.theme.light")}
              </button>
              <button
                onClick={changeLanguage}
                style={{
                  margin: "4px 12px",
                  height: "40px",
                  width: "calc(100% - 24px)",
                  borderRadius: "8px",
                  ...menuButtonColors,
                  cursor: "pointer",
                }}
              >
                {i18n.language?.toLowerCase().startsWith("hr") ? "HR" : "EN"}
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://github.com/strukovnasamobor/gym-how",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                style={{
                  margin: "4px 12px",
                  height: "40px",
                  width: "calc(100% - 24px)",
                  borderRadius: "8px",
                  ...menuButtonColors,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t("navbar.sourceCode")}
              </button>
              <button
                onClick={() =>
                  window.open(
                    "https://www.paypal.com/ncp/payment/SCP82RZYUETTL",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                style={{
                  margin: "4px 12px",
                  height: "40px",
                  width: "calc(100% - 24px)",
                  borderRadius: "8px",
                  ...menuButtonColors,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {t("navbar.support")}
              </button>
            </Stack>
          )}
        </Box>
      </Stack>

      {isSearchOpen && (
        <Box
          className="search-panel"
          sx={{
            position: "absolute",
            top: "70px",
            left: 0,
            right: 0,
            backgroundColor: "#fff",
            padding: "16px",
            borderRadius: "12px",
            boxShadow: "0px 4px 12px rgba(0,0,0,0.15)",
            zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            autoFocus
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value.toLowerCase())}
            onKeyPress={handleKeyPress}
            placeholder={t("searchExercises.placeholder")}
            style={{
              width: "100%",
              padding: "12px",
              paddingRight: searchInput ? "44px" : "12px",
              borderRadius: "8px",
              border: "1px solid #ccc",
              fontSize: "16px",
            }}
          />
          {searchInput && (
            <button
              type="button"
              onClick={clearSearch}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: "26px",
                top: "50%",
                transform: "translateY(-50%)",
                width: "28px",
                height: "28px",
                border: "none",
                borderRadius: "999px",
                backgroundColor: "#020202",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "18px",
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </Box>
      )}
    </Box>
  );
};
export default Navbar;

//9.linija -> Stack se koristi za organizaciju elemenata u horizontalnom smjeru (direction="row") i postavlja razmak između elemenata (gap) te marginu na vrhu (marginTop) ovisno o veličini ekrana (sm i xs)
//         -> px je padding horizontalno, gap je razmak između elemenata, marginTop je razmak od vrha, justifyContent je poravnanje elemenata
