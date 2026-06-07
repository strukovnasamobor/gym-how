import React, { useEffect, useState } from "react";
import { Box, Button, Stack, TextField, Typography } from "@mui/material";

import {
  BODYPARTS_CACHE_KEY,
  EXERCISES_CACHE_KEY,
  fetchAllExercises,
  filterExercisesByQuery,
  getBodyPartsFromExercises,
  readCachedJson,
  writeCachedJson,
} from "../utils/fetchData.jsx";
import HorizontalScrollbar from "./HorizontalScrollbar.jsx";
import { useTranslation, Trans } from "react-i18next";

const SearchExercises = ({
  setExercises,
  bodyPart,
  setBodyPart,
  setDetailFilter,
}) => {
  const [search, setSearch] = useState("");
  const [bodyParts, setBodyParts] = useState([]);
  const { t } = useTranslation();

  const scrollToExercisesResults = () => {
    setTimeout(() => {
      const exercisesSection = document.getElementById("exercises");
      if (exercisesSection) {
        exercisesSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
  };

  useEffect(() => {
    const fetchExercisesData = async () => {
      const cachedBodyParts = readCachedJson(BODYPARTS_CACHE_KEY, null);
      if (Array.isArray(cachedBodyParts) && cachedBodyParts.length > 0) {
        setBodyParts(["all", ...cachedBodyParts]);
        return;
      }

      const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, []);
      if (Array.isArray(cachedExercises) && cachedExercises.length > 0) {
        const derivedBodyParts = getBodyPartsFromExercises(cachedExercises);

        writeCachedJson(BODYPARTS_CACHE_KEY, derivedBodyParts);
        setBodyParts(["all", ...derivedBodyParts]);
        return;
      }

      const allExercises = await fetchAllExercises();
      if (Array.isArray(allExercises) && allExercises.length > 0) {
        const nextBodyParts = getBodyPartsFromExercises(allExercises);
        writeCachedJson(EXERCISES_CACHE_KEY, allExercises);
        writeCachedJson(BODYPARTS_CACHE_KEY, nextBodyParts);
        setBodyParts(["all", ...nextBodyParts]);
      } else {
        // Keep the UI usable even when rate-limited by the API.
        setBodyParts(["all"]);
      }
    };

    fetchExercisesData();
  }, []);

  const handleSearch = async () => {
    const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, []);

    if (!search.trim()) {
      setDetailFilter({ type: "bodyPart", value: "all" });
      if (Array.isArray(cachedExercises) && cachedExercises.length > 0) {
        setExercises(cachedExercises);
        scrollToExercisesResults();
        return;
      }

      const allExercises = await fetchAllExercises();
      if (Array.isArray(allExercises) && allExercises.length > 0) {
        writeCachedJson(EXERCISES_CACHE_KEY, allExercises);
        writeCachedJson(
          BODYPARTS_CACHE_KEY,
          getBodyPartsFromExercises(allExercises),
        );
        setExercises(allExercises);
        scrollToExercisesResults();
      }
      return;
    }

    if (Array.isArray(cachedExercises) && cachedExercises.length > 0) {
      const searchedExercises = filterExercisesByQuery(cachedExercises, search);

      // DEBUG: log search results for diagnosis
      // eslint-disable-next-line no-console
      console.log("Search debug (cached):", {
        search,
        matches: searchedExercises.length,
        sample: searchedExercises.slice(0, 5).map((e) => e.name),
      });

      setDetailFilter({ type: "search", value: search });
      setSearch("");
      setExercises(searchedExercises);
      scrollToExercisesResults();
      return;
    }

    const exercisesData = await fetchAllExercises();
    if (!Array.isArray(exercisesData) || exercisesData.length === 0) {
      setExercises([]);
      scrollToExercisesResults();
      return;
    }

    writeCachedJson(EXERCISES_CACHE_KEY, exercisesData);
    writeCachedJson(
      BODYPARTS_CACHE_KEY,
      getBodyPartsFromExercises(exercisesData),
    );
    const searchedExercises = filterExercisesByQuery(exercisesData, search);

    // DEBUG: log search results for diagnosis
    // eslint-disable-next-line no-console
    console.log("Search debug (fetched):", {
      search,
      matches: searchedExercises.length,
      sample: searchedExercises.slice(0, 5).map((e) => e.name),
    });

    setDetailFilter({ type: "search", value: search });
    setSearch("");
    setExercises(searchedExercises);
    scrollToExercisesResults();
  };

  const handleReset = async () => {
    setSearch("");
    // reset to all
    setBodyPart("all");
    setDetailFilter({ type: "bodyPart", value: "all" });

    const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, []);
    if (Array.isArray(cachedExercises) && cachedExercises.length > 0) {
      setExercises(cachedExercises);
      scrollToExercisesResults();
      return;
    }

    const allExercises = await fetchAllExercises();
    if (Array.isArray(allExercises) && allExercises.length > 0) {
      writeCachedJson(EXERCISES_CACHE_KEY, allExercises);
      setExercises(allExercises);
    } else {
      setExercises([]);
    }

    scrollToExercisesResults();
  };

  return (
    <Stack alignItems="center" mt="37px" justifyContent="center" padding="20px">
      <Typography
        fontWeight={700}
        sx={{ fontSize: { lg: "44px", xs: "30px" } }}
        mb="50px"
        textAlign="center"
      >
        <Trans i18nKey="searchExercises.title" components={{ br: <br /> }} />
      </Typography>
      <Box mb={{ xs: "36px", sm: "48px", lg: "72px" }}>
        <TextField
          sx={{
            input: { fontWeight: "700", border: "none", borderRadius: "4px" },
            width: { lg: "800px", xs: "350px" },
            backgroundColor: "white",
            borderRadius: "40px",
          }}
          height="76px"
          value={search}
          onChange={(e) => setSearch(e.target.value.toLowerCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSearch();
            }
          }}
          placeholder={t("searchExercises.placeholder")}
          type="text"
        />

        <Box
          sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 }}
        >
          <Button
            className="search-btn"
            sx={{
              backgroundColor: "#FF2625",
              color: "white",
              textTransform: "none",
              width: { lg: "175px", xs: "100px" },
              fontSize: { lg: "20px", xs: "14px" },
              height: "56px",
            }}
            onClick={handleSearch}
          >
            {t("searchExercises.button")}
          </Button>
        </Box>
      </Box>
      <Box sx={{ position: "relative", width: "100%", px: { xs: 0.5, sm: 1 } }}>
        <HorizontalScrollbar
          data={bodyParts}
          bodyPart={bodyPart}
          setBodyPart={setBodyPart}
          setDetailFilter={setDetailFilter}
          isBodyParts
        />
      </Box>
    </Stack>
  );
};

export default SearchExercises;

// <TextField /> je isto kao i <TextField></Textfield>
// sx je prop koji se koristi za stiliziranje komponenti u MUI (Material-UI) biblioteci, omogućava nam da direktno primijenimo CSS stilove na komponentu. U ovom slučaju, koristi se za prilagođavanje izgleda TextField komponente, uključujući font, širinu, boju pozadine i border-radius.
