import React, { useContext, useState, useEffect, useRef, useMemo } from "react";
import { Box } from "@mui/material";
import { ScrollMenu, VisibilityContext } from "react-horizontal-scrolling-menu";
import { AppContext } from "../AppContext";
 
import BodyPart from "./BodyPart";
import ExerciseCard from "./ExerciseCard";
 
const LeftArrow = ({ isCompact, onArrowNavigate }) => {
  const { scrollPrev } = useContext(VisibilityContext);
 
  return (
    <button
      type="button"
      onClick={() => {
        if (onArrowNavigate) {
          onArrowNavigate();
        }
        scrollPrev("smooth");
      }}
      aria-label="Previous"
      style={{
        position: "absolute",
        top: isCompact ? "46%" : "50%",
        left: isCompact ? "6px" : "12px",
        transform: "translateY(-50%)",
        width: isCompact ? "36px" : "42px",
        height: isCompact ? "36px" : "42px",
        borderRadius: "999px",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        color: "#fff",
        fontSize: isCompact ? "24px" : "30px",
        lineHeight: 1,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
      }}
    >
      {"\u2039"}
    </button>
  );
};
 
const RightArrow = ({ isCompact, onArrowNavigate }) => {
  const { scrollNext } = useContext(VisibilityContext);
 
  return (
    <button
      type="button"
      onClick={() => {
        if (onArrowNavigate) {
          onArrowNavigate();
        }
        scrollNext("smooth");
      }}
      aria-label="Next"
      style={{
        position: "absolute",
        top: isCompact ? "46%" : "50%",
        right: isCompact ? "6px" : "12px",
        transform: "translateY(-50%)",
        width: isCompact ? "36px" : "42px",
        height: isCompact ? "36px" : "42px",
        borderRadius: "999px",
        border: "1px solid rgba(255, 255, 255, 0.25)",
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        color: "#fff",
        fontSize: isCompact ? "24px" : "30px",
        lineHeight: 1,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 5,
      }}
    >
      {"\u203A"}
    </button>
  );
};
 
const HorizontalScrollbar = ({ data, bodyPart, setBodyPart, setDetailFilter, isBodyParts }) => {
  const { isDarkMode } = useContext(AppContext);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [dots, setDots] = useState([]);
  const [activeDotIndex, setActiveDotIndex] = useState(0);
  const [mobileActiveIndex, setMobileActiveIndex] = useState(0);
  const apiRef = useRef(null);
  const dotClickLockRef = useRef({ targetIndex: null, startedAt: 0 });
  const syncTimeoutsRef = useRef([]);
  const itemIds = useMemo(
    () => data.map((item) => String(item.id || item)),
    [data],
  );
 
  const DESKTOP_VISIBLE = 5;
 
  const clearPendingSyncTimeouts = () => {
    syncTimeoutsRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
    syncTimeoutsRef.current = [];
  };
 
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
 
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isBodyParts || !isMobile || !itemIds.length) return;

    const selectedIndex = itemIds.findIndex(
      (itemId) => itemId === String(bodyPart),
    );
    const nextIndex =
      selectedIndex >= 0
        ? selectedIndex
        : Math.min(mobileActiveIndex, itemIds.length - 1);

    setMobileActiveIndex(nextIndex);
    setActiveDotIndex(nextIndex);
    setDots((prevDots) => {
      const nextDots = itemIds.map((_, index) => index);
      const isSameDots =
        prevDots.length === nextDots.length &&
        prevDots.every((dot, index) => dot === nextDots[index]);
      return isSameDots ? prevDots : nextDots;
    });
  }, [bodyPart, itemIds, isBodyParts, isMobile, mobileActiveIndex]);
 
  useEffect(() => {
    return () => {
      clearPendingSyncTimeouts();
    };
  }, []);
 
  const getMostVisibleIndex = (api, items) => {
    const visibleItems = api?.visibleItems || [];
    if (!items.length || !visibleItems.length) {
      return -1;
    }
 
    let bestIndex = -1;
    let bestRatio = -1;
 
    visibleItems.forEach((rawVisibleId) => {
      const visibleId = String(rawVisibleId);
      const itemMeta = api.getItemById?.(visibleId);
      const itemIndex = Number(itemMeta?.index);
      const ratio = Number(itemMeta?.entry?.intersectionRatio ?? 0);
 
      if (!Number.isInteger(itemIndex) || itemIndex < 0) {
        return;
      }
 
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestIndex = itemIndex;
      }
    });
 
    if (bestIndex >= 0) {
      return Math.min(items.length - 1, bestIndex);
    }
 
    const fallbackVisibleId = String(visibleItems[0]);
    const fallbackIndex = items.findIndex(
      (itemId) => itemId === fallbackVisibleId,
    );
    return fallbackIndex;
  };
 
  const syncDots = (api) => {
    if (!isBodyParts || !api) return;
    apiRef.current = api;
 
    const items = itemIds;
    const visibleItems = api.visibleItems || [];
 
    const totalPages = isMobile
      ? Math.max(1, items.length)
      : Math.ceil(items.length / DESKTOP_VISIBLE);
 
    const pageIndexes = Array.from({ length: totalPages }, (_, index) => index);
    setDots(pageIndexes);
 
    if (!items.length || !visibleItems.length) return;
 
    // If the last item is visible, always snap to the last dot
    const isLastItemVisible = visibleItems
      .map(String)
      .includes(String(items[items.length - 1]));
 
    if (isLastItemVisible) {
      const { targetIndex, startedAt } = dotClickLockRef.current;
      if (targetIndex !== null) {
        const elapsed = Date.now() - startedAt;
        const isExpired = elapsed > 500;
        if (!isExpired) {
          dotClickLockRef.current = { targetIndex: null, startedAt: 0 };
        }
      }
      setActiveDotIndex(totalPages - 1);
      return;
    }
 
    const mostVisibleIndex = getMostVisibleIndex(api, items);
    if (mostVisibleIndex < 0) return;
 
    const nextActiveIndex = Math.min(
      totalPages - 1,
      isMobile
        ? Math.max(0, mostVisibleIndex)
        : Math.max(0, Math.round(mostVisibleIndex / DESKTOP_VISIBLE)),
    );
 
    const { targetIndex, startedAt } = dotClickLockRef.current;
    if (targetIndex !== null) {
      const elapsed = Date.now() - startedAt;
      const isTargetReached = nextActiveIndex === targetIndex;
      const isExpired = elapsed > 500;
 
      if (!isTargetReached && !isExpired) return;
 
      dotClickLockRef.current = { targetIndex: null, startedAt: 0 };
    }
 
    setActiveDotIndex(nextActiveIndex);
  };
 
  const handleDotClick = (pageIndex) => {
    if (!apiRef.current) return;
 
    const items = itemIds;
    const totalPages = isMobile
      ? Math.max(1, items.length)
      : Math.ceil(items.length / DESKTOP_VISIBLE);
 
    const isLastPage = pageIndex === totalPages - 1;
 
    const targetIndex = isLastPage
      ? items.length - 1
      : isMobile
        ? Math.min(items.length - 1, pageIndex)
        : Math.min(items.length - 1, pageIndex * DESKTOP_VISIBLE);
 
    const targetId = items[targetIndex];
    const targetItem = apiRef.current.getItemElementById?.(targetId);
 
    if (!targetItem || !apiRef.current.scrollToItem) return;
 
    apiRef.current.scrollToItem(
      targetItem,
      "smooth",
      isLastPage ? "end" : "start",
      "nearest",
    );
    dotClickLockRef.current = { targetIndex: pageIndex, startedAt: Date.now() };
    setActiveDotIndex(pageIndex);
 
    clearPendingSyncTimeouts();
    [120, 300, 520].forEach((delay) => {
      const timeoutId = setTimeout(() => {
        if (apiRef.current) {
          syncDots(apiRef.current);
        }
      }, delay);
      syncTimeoutsRef.current.push(timeoutId);
    });
  };
 
  const handleArrowNavigate = () => {
    dotClickLockRef.current = { targetIndex: null, startedAt: 0 };
 
    clearPendingSyncTimeouts();
    [120, 300, 520].forEach((delay) => {
      const timeoutId = setTimeout(() => {
        if (apiRef.current) {
          syncDots(apiRef.current);
        }
      }, delay);
      syncTimeoutsRef.current.push(timeoutId);
    });
  };

  const handleMobileNavigate = (direction) => {
    if (!data.length) return;

    const nextIndex =
      (mobileActiveIndex + direction + data.length) % data.length;

    setMobileActiveIndex(nextIndex);
    setActiveDotIndex(nextIndex);
    setBodyPart?.(data[nextIndex]);
  };

  const handleMobileDotClick = (pageIndex) => {
    if (!data.length) return;

    setMobileActiveIndex(pageIndex);
    setActiveDotIndex(pageIndex);
    setBodyPart?.(data[pageIndex]);
  };
 
  const margin = isBodyParts
    ? isMobile
      ? "0 6px"
      : "0 10px"
    : isMobile
      ? "0 8px"
      : "0 40px";

  if (isBodyParts && isMobile) {
    const activeItem = data[mobileActiveIndex] ?? data[0];

    return (
      <Box
        sx={{
          position: "relative",
          width: "100%",
          maxWidth: "420px",
          mx: "auto",
          pt: 1,
          pb: 4,
        }}
      >
        <Box
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
            px: { xs: 6.5, sm: 8 },
          }}
        >
          <button
            type="button"
            aria-label="Previous"
            onClick={() => handleMobileNavigate(-1)}
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: "36px",
              height: "36px",
              borderRadius: "999px",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              color: "#fff",
              fontSize: "24px",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 5,
            }}
          >
            {"\u2039"}
          </button>

          <Box sx={{ display: "flex", justifyContent: "center", width: "100%" }}>
            {activeItem ? (
              <BodyPart
                item={activeItem}
                bodyPart={bodyPart}
                setBodyPart={setBodyPart}
                setDetailFilter={setDetailFilter}
                compact
              />
            ) : null}
          </Box>

          <button
            type="button"
            aria-label="Next"
            onClick={() => handleMobileNavigate(1)}
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              width: "36px",
              height: "36px",
              borderRadius: "999px",
              border: "1px solid rgba(255, 255, 255, 0.25)",
              backgroundColor: "rgba(0, 0, 0, 0.55)",
              color: "#fff",
              fontSize: "24px",
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 5,
            }}
          >
            {"\u203A"}
          </button>
        </Box>

        {dots.length > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              mt: 1.5,
            }}
          >
            {dots.map((pageIndex) => (
              <button
                key={pageIndex}
                type="button"
                aria-label={`Go to slide ${pageIndex + 1}`}
                onClick={() => handleMobileDotClick(pageIndex)}
                style={{
                  width: activeDotIndex === pageIndex ? "18px" : "8px",
                  height: "8px",
                  borderRadius: "999px",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  backgroundColor:
                    activeDotIndex === pageIndex
                      ? "#FF2625"
                      : isDarkMode
                        ? "rgba(255, 255, 255, 0.35)"
                        : "#bdbdbd",
                }}
              />
            ))}
          </Box>
        )}
      </Box>
    );
  }
 
  if (!isBodyParts) {
    return (
      <ScrollMenu LeftArrow={LeftArrow} RightArrow={RightArrow}>
        {data.map((item, index) => (
          <Box
            key={String(item.id || item)}
            itemId={String(item.id || item)}
            title={String(item.id || item)}
            margin={margin}
            sx={
              isMobile
                ? {
                    ...(index === 0 && { ml: "0" }),
                    ...(index === data.length - 1 && { mr: "0" }),
                  }
                : {}
            }
          >
            <ExerciseCard exercise={item} />
          </Box>
        ))}
      </ScrollMenu>
    );
  }
 
  return (
    <Box sx={{ position: "relative", pb: isBodyParts ? 4 : 0 }}>
      <ScrollMenu
        LeftArrow={() => (
          <LeftArrow
            isCompact={isMobile}
            onArrowNavigate={handleArrowNavigate}
          />
        )}
        RightArrow={() => (
          <RightArrow
            isCompact={isMobile}
            onArrowNavigate={handleArrowNavigate}
          />
        )}
        apiRef={apiRef}
        onInit={syncDots}
        onUpdate={syncDots}
      >
        {data.map((item) => (
          <Box
            key={String(item.id || item)}
            itemId={String(item.id || item)}
            title={String(item.id || item)}
            margin={margin}
          >
            {isBodyParts ? (
              <BodyPart
                item={item}
                bodyPart={bodyPart}
                setBodyPart={setBodyPart}
                setDetailFilter={setDetailFilter}
              />
            ) : (
              <ExerciseCard exercise={item} />
            )}
          </Box>
        ))}
      </ScrollMenu>
 
      {isBodyParts && dots.length > 1 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
            mt: 1.5,
          }}
        >
          {dots.map((pageIndex) => (
            <button
              key={pageIndex}
              type="button"
              aria-label={`Go to slide ${pageIndex + 1}`}
              onClick={() => handleDotClick(pageIndex)}
              style={{
                width: activeDotIndex === pageIndex ? "18px" : "8px",
                height: "8px",
                borderRadius: "999px",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.2s ease",
                backgroundColor:
                  activeDotIndex === pageIndex
                    ? "#FF2625"
                    : isDarkMode
                      ? "rgba(255, 255, 255, 0.35)"
                      : "#bdbdbd",
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
 
export default HorizontalScrollbar;