import React, { useEffect, useState } from "react";

import {
  fetchExerciseAnimationBlobUrl,
  getExerciseAnimationUrl,
} from "../utils/fetchData";

const ExerciseImage = ({
  exercise,
  fallbackSrc,
  alt,
  className,
  style,
  loading = "lazy",
  fetchRemoteImage = true,
}) => {
  const [resolvedSrc, setResolvedSrc] = useState(fallbackSrc || "");

  useEffect(() => {
    if (!fetchRemoteImage) {
      setResolvedSrc(fallbackSrc || "");
      return undefined;
    }

    let isCancelled = false;

    const resolveImage = async () => {
      if (!exercise?.id) {
        setResolvedSrc(fallbackSrc || "");
        return;
      }

      const rawGifUrl = String(exercise?.gifUrl || "");
      const isRapidApiImage = rawGifUrl.includes(
        "exercises11.p.rapidapi.com/images/",
      );

      if (!isRapidApiImage && rawGifUrl) {
        setResolvedSrc(rawGifUrl);
        return;
      }

      const blobUrl = await fetchExerciseAnimationBlobUrl(exercise.id);
      if (!isCancelled) {
        setResolvedSrc(
          blobUrl || fallbackSrc || getExerciseAnimationUrl(exercise.id),
        );
      }
    };

    resolveImage();

    return () => {
      isCancelled = true;
    };
  }, [exercise?.id, exercise?.gifUrl, fallbackSrc, fetchRemoteImage]);

  return (
    <img
      src={resolvedSrc || fallbackSrc}
      alt={alt || exercise?.name || "Exercise"}
      loading={loading}
      className={className}
      style={{ cursor: "pointer", ...style }}
      onError={(event) => {
        if (fallbackSrc && event.currentTarget.src !== fallbackSrc) {
          event.currentTarget.src = fallbackSrc;
        }
      }}
    />
  );
};

export default ExerciseImage;
