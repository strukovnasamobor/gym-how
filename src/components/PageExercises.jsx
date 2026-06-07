import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Box, Stack, Typography, TextField } from "@mui/material";
import Pagination from "@mui/material/Pagination";
import PaginationItem from "@mui/material/PaginationItem";
import { useTranslation } from "react-i18next";
import PageJumpDialog from "./PageJumpDialog";

import {
  BODYPARTS_CACHE_KEY,
  EXERCISES_CACHE_KEY,
  fetchAllExercises,
  filterExercisesByQuery,
  getBodyPartsFromExercises,
  getExerciseBodyParts,
  readCachedJson,
  writeCachedJson,
} from "../utils/fetchData";
const placeholder = "/images/placeholder.png";
import Loader from "./Loader";
import { AppContext } from "../AppContext";
import ExerciseImage from "./ExerciseImage";

const MIN_EXPECTED_CACHED_ITEMS = 200;
const EXERCISES_PER_PAGE = 25;

const PageExercises = () => {
  const [exercises, setExercises] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { exerciseSortOrder, isDarkMode } = useContext(AppContext);
  const location = useLocation();
  const navigate = useNavigate();
  const didMountRef = useRef(false);
  const { t } = useTranslation();

  const searchQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return (params.get("q") || "").trim().toLowerCase();
  }, [location.search]);

  const selectedBodyParts = useMemo(() => {
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
  }, [location.search]);

  const selectedBodyPartsKey = useMemo(
    () => selectedBodyParts.join(","),
    [selectedBodyParts],
  );

  const currentPage = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const parsedPage = Number(params.get("page"));
    return Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  }, [location.search]);

  const setPageInUrl = (nextPage, replace = false) => {
    const params = new URLSearchParams(location.search);

    if (nextPage <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }

    const nextSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: nextSearch ? `?${nextSearch}` : "",
      },
      { replace },
    );
  };

  useEffect(() => {
    const loadExercises = async () => {
      setIsLoading(true);

      try {
        const cachedExercises = readCachedJson(EXERCISES_CACHE_KEY, null);

        if (
          Array.isArray(cachedExercises) &&
          cachedExercises.length >= MIN_EXPECTED_CACHED_ITEMS
        ) {
          setExercises(cachedExercises);
          return;
        }

        const allExercises = await fetchAllExercises();
        if (!Array.isArray(allExercises)) {
          setExercises([]);
          return;
        }

        writeCachedJson(EXERCISES_CACHE_KEY, allExercises);
        writeCachedJson(
          BODYPARTS_CACHE_KEY,
          getBodyPartsFromExercises(allExercises),
        );
        setExercises(allExercises);
      } catch (error) {
        console.error("Failed to fetch exercises:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, []);

  const filteredExercises = useMemo(() => {
    if (!Array.isArray(exercises)) {
      return [];
    }

    const queryFiltered = searchQuery
      ? filterExercisesByQuery(exercises, searchQuery)
      : exercises;

    if (selectedBodyParts.length === 0) {
      return queryFiltered;
    }

    return queryFiltered.filter((exercise) =>
      getExerciseBodyParts(exercise).some((part) =>
        selectedBodyParts.includes(part),
      ),
    );
  }, [exercises, searchQuery, selectedBodyParts]);

  const groupedExercises = useMemo(() => {
    if (!Array.isArray(filteredExercises)) {
      return [];
    }

    if (exerciseSortOrder === "common") {
      const normalize = (value) =>
        String(value || "")
          .trim()
          .toLowerCase();
      const toLabel = (value) =>
        String(value || "")
          .trim()
          .split(" ")
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

      const selectedSet = new Set(
        selectedBodyParts.map((part) => normalize(part)),
      );

      const targetToBodyParts = new Map();
      filteredExercises.forEach((exercise) => {
        const bodyParts = getExerciseBodyParts(exercise).map((part) =>
          normalize(part),
        );
        const target = normalize(exercise?.target);

        if (bodyParts.length === 0 || !target) {
          return;
        }

        if (!targetToBodyParts.has(target)) {
          targetToBodyParts.set(target, new Set());
        }

        bodyParts.forEach((part) => targetToBodyParts.get(target).add(part));
      });

      const groupsByKey = new Map();

      filteredExercises.forEach((exercise) => {
        const bodyParts = getExerciseBodyParts(exercise).map((part) =>
          normalize(part),
        );
        const target = normalize(exercise?.target);

        if (bodyParts.length === 0) {
          return;
        }

        const candidateParts = targetToBodyParts.has(target)
          ? Array.from(targetToBodyParts.get(target))
          : bodyParts;

        const scopedParts =
          selectedSet.size > 0
            ? candidateParts.filter((part) => selectedSet.has(part))
            : candidateParts;

        const finalParts = (
          scopedParts.length > 0 ? scopedParts : bodyParts
        ).sort((a, b) => a.localeCompare(b));

        const comboKey = finalParts.join("|");
        const selectedCount =
          selectedSet.size > 0
            ? selectedSet.size
            : new Set(
                filteredExercises.flatMap((item) =>
                  getExerciseBodyParts(item).map((part) => normalize(part)),
                ),
              ).size;

        if (!groupsByKey.has(comboKey)) {
          groupsByKey.set(comboKey, {
            letter: `${finalParts.map(toLabel).join(" & ")} (${finalParts.length}/${Math.max(
              1,
              selectedCount,
            )})`,
            coverage: finalParts.length,
            items: [],
          });
        }

        groupsByKey.get(comboKey).items.push(exercise);
      });

      const groups = Array.from(groupsByKey.values())
        .map((group) => ({
          ...group,
          items: [...group.items].sort((a, b) =>
            (a.name || "").localeCompare(b.name || "", undefined, {
              sensitivity: "base",
            }),
          ),
        }))
        .sort((a, b) => {
          if (b.coverage !== a.coverage) {
            return b.coverage - a.coverage;
          }

          if (b.items.length !== a.items.length) {
            return b.items.length - a.items.length;
          }

          return a.letter.localeCompare(b.letter);
        })
        .map(({ letter, items }) => ({ letter, items }));

      return groups;
    }

    const sortedExercises = [...filteredExercises].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "", undefined, {
        sensitivity: "base",
      }),
    );

    if (exerciseSortOrder === "za") {
      sortedExercises.reverse();
    }

    const grouped = sortedExercises.reduce((accumulator, exercise) => {
      const firstCharacter = (exercise.name || "")
        .trim()
        .charAt(0)
        .toUpperCase();
      const letter = /^[A-Z]$/.test(firstCharacter) ? firstCharacter : "#";

      if (!accumulator[letter]) {
        accumulator[letter] = [];
      }

      accumulator[letter].push(exercise);
      return accumulator;
    }, {});

    const orderedLetters = Object.keys(grouped).sort((a, b) =>
      exerciseSortOrder === "za" ? b.localeCompare(a) : a.localeCompare(b),
    );

    return orderedLetters.map((letter) => ({ letter, items: grouped[letter] }));
  }, [filteredExercises, exerciseSortOrder]);

  const groupedExercisePages = useMemo(() => {
    const pages = [];
    let currentPageGroups = [];
    let remainingSlots = EXERCISES_PER_PAGE;

    groupedExercises.forEach((group) => {
      let groupItems = Array.isArray(group.items) ? [...group.items] : [];

      while (groupItems.length > 0) {
        if (remainingSlots === 0) {
          pages.push(currentPageGroups);
          currentPageGroups = [];
          remainingSlots = EXERCISES_PER_PAGE;
        }

        const itemsToTake = Math.min(groupItems.length, remainingSlots);
        const itemChunk = groupItems.slice(0, itemsToTake);
        groupItems = groupItems.slice(itemsToTake);

        currentPageGroups.push({
          letter: group.letter,
          items: itemChunk,
        });

        remainingSlots -= itemsToTake;
      }
    });

    if (currentPageGroups.length > 0) {
      pages.push(currentPageGroups);
    }

    return pages.length > 0 ? pages : [[]];
  }, [groupedExercises]);

  const totalPages = groupedExercisePages.length;
  const [jumpOpen, setJumpOpen] = useState(false);

  const EllipsisJump = () => {
    const [editing, setEditing] = useState(false);
    const [val, setVal] = useState(String(currentPage));
    const inputRef = useRef(null);

    useEffect(() => setVal(String(currentPage)), [currentPage]);

    useEffect(() => {
      if (editing) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [editing]);

    const submit = () => {
      const n = parseInt(val, 10);
      if (Number.isNaN(n)) {
        setEditing(false);
        return;
      }
      const page = Math.max(1, Math.min(totalPages, n));
      // call the same handler used for normal page changes
      handlePageChange(null, page);
      setEditing(false);
    };

    if (!editing) {
      return (
        <Box
          component="button"
          type="button"
          onClick={() => setEditing(true)}
          sx={{
            minWidth: 22,
            border: 0,
            background: "transparent",
            cursor: "pointer",
            font: "inherit",
            color: isDarkMode ? "#ffffff" : "#000000",
            px: 0.25,
          }}
          className="MuiPaginationItem-ellipsis"
        >
          ...
        </Box>
      );
    }

    return (
      <Box sx={{ px: 0.25 }}>
        <TextField
          inputRef={inputRef}
          autoFocus
          size="small"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={() => setEditing(false)}
          inputProps={{
            inputMode: "numeric",
            pattern: "[0-9]*",
            style: { width: 36, textAlign: "center" },
          }}
        />
      </Box>
    );
  };

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    setPageInUrl(1, true);
  }, [exerciseSortOrder, searchQuery, selectedBodyPartsKey]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (currentPage < 1) {
      setPageInUrl(1, true);
      return;
    }

    if (currentPage > totalPages) {
      setPageInUrl(totalPages, true);
    }
  }, [currentPage, totalPages, isLoading]);

  const paginatedGroups = groupedExercisePages[currentPage - 1] || [];

  const handlePageChange = (event, value) => {
    setPageInUrl(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Box mt="50px" p="20px" pb="120px">
      <Typography variant="h3" mb="30px">
        {t("pageExercises.title", {
          sort:
            exerciseSortOrder === "common"
              ? t("pageExercises.sort.common")
              : exerciseSortOrder === "za"
                ? t("pageExercises.sort.za")
                : t("pageExercises.sort.az"),
        })}
      </Typography>
      <Typography variant="body1" color="text.secondary" mb="20px">
        {t("pageExercises.totalExercises", {
          count: filteredExercises.length,
        })}
      </Typography>

      {isLoading ? (
        <Loader />
      ) : (
        <Stack gap="28px">
          {paginatedGroups.map((group) => (
            <Box key={group.letter}>
              <Typography variant="h4" fontWeight={700} mb="14px">
                {group.letter}
              </Typography>

              <Stack gap="10px">
                {group.items.map((exercise) => (
                  <Link
                    key={exercise.id}
                    to={`/exercise/${exercise.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      sx={{
                        p: "8px 12px",
                        borderRadius: "10px",
                        backgroundColor: isDarkMode ? "#f1f1f1" : "transparent",
                        color: "#111",
                        "&:hover": {
                          backgroundColor: isDarkMode ? "#e9e9e9" : "#f7f7f7",
                        },
                      }}
                    >
                      <ExerciseImage
                        exercise={exercise}
                        fallbackSrc={placeholder}
                        alt={exercise.name}
                        style={{
                          width: "52px",
                          height: "52px",
                          borderRadius: "8px",
                          objectFit: "cover",
                          border: "1px solid #e7e7e7",
                        }}
                      />
                      <Typography
                        className="exercise-name-text"
                        fontSize="18px"
                        textTransform="capitalize"
                        sx={{ color: "#111 !important" }}
                      >
                        {exercise.name}
                      </Typography>
                    </Stack>
                  </Link>
                ))}
              </Stack>
            </Box>
          ))}

          {totalPages > 1 && (
            <Stack
              mt="24px"
              alignItems="center"
              sx={{
                width: "100%",
                overflowX: { xs: "auto", sm: "visible" },
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Pagination
                color="standard"
                shape="rounded"
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                renderItem={(item) => {
                  if (
                    item.type === "start-ellipsis" ||
                    item.type === "end-ellipsis"
                  ) {
                    return <EllipsisJump itemType={item.type} />;
                  }
                  return <PaginationItem {...item} />;
                }}
                size="large"
                sx={{
                  overflowX: "auto",
                  px: 1,
                  "& .MuiPagination-ul": {
                    display: "flex",
                    flexWrap: "nowrap",
                    whiteSpace: "nowrap",
                  },
                  "& .MuiPaginationItem-root": {
                    color: isDarkMode ? "#ffffff" : "#000000",
                    minWidth: { xs: 32, sm: "auto" },
                    px: { xs: 0.6, sm: 1 },
                  },
                  "& .MuiPaginationItem-root.Mui-selected": {
                    color: isDarkMode ? "#ffffff" : "#000000",
                    backgroundColor: isDarkMode
                      ? "rgba(255, 255, 255, 0.12)"
                      : "rgba(0, 0, 0, 0.08)",
                  },
                }}
              />
              <PageJumpDialog
                open={jumpOpen}
                onClose={() => setJumpOpen(false)}
                totalPages={totalPages}
                initial={currentPage}
                onSubmit={(page) => {
                  handlePageChange(null, page);
                }}
              />
            </Stack>
          )}
        </Stack>
      )}
    </Box>
  );
};

export default PageExercises;
