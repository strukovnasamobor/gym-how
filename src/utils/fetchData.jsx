const RAPID_API_KEY =
  import.meta.env.VITE_RAPID_API_KEY ||
  import.meta.env.VITE_RAPID_API_KEY_2 ||
  import.meta.env.VITE_RAPID_API_KEY_3 ||
  "";

export const exerciseOptions = {
  method: "GET",
  headers: {
    "x-rapidapi-key": RAPID_API_KEY,
    "x-rapidapi-host": "exercises11.p.rapidapi.com",
  },
};

export const animationOptions = {
  method: "GET",
  headers: {
    "x-rapidapi-key": RAPID_API_KEY,
    "x-rapidapi-host": "exercises11.p.rapidapi.com",
  },
};

export const EXERCISES11_BASE_URL = "https://exercises11.p.rapidapi.com";
export const EXERCISES_CACHE_KEY = "exercises_all_alphabet_v5";
export const BODYPARTS_CACHE_KEY = "bodyParts_v2";
export const API_RATE_LIMIT_UNTIL_KEY = "api_rate_limited_until";

const markApiRateLimited = () => {
  if (typeof window === "undefined") {
    return;
  }

  const untilTimestamp = Date.now() + 3 * 60 * 1000;
  try {
    localStorage.setItem(API_RATE_LIMIT_UNTIL_KEY, String(untilTimestamp));
    window.dispatchEvent(new Event("gymhow-api-rate-limit"));
  } catch {
    // Ignore localStorage failures.
  }
};

const safeParseJson = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const readCachedJson = (key, fallback = null) => {
  const storedValue = localStorage.getItem(key);
  if (!storedValue) {
    return fallback;
  }

  const parsedValue = safeParseJson(storedValue);
  return parsedValue === null ? fallback : parsedValue;
};

export const writeCachedJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to cache ${key}:`, error);
  }
};

export const youtubeOptions = {
  method: "GET",
  url: "https://youtube-search-and-download.p.rapidapi.com/video/related",
  headers: {
    "x-rapidapi-host": "youtube-search-and-download.p.rapidapi.com",
    "x-rapidapi-key": RAPID_API_KEY,
  },
};

export const fetchData = async (url, options) => {
  const response = await fetch(url, options);

  if (!response.ok) {
    if (response.status === 429) {
      markApiRateLimited();
      return null;
    }

    if (response.status === 403) {
      console.warn(
        `RapidAPI key is not authorized for this endpoint: ${url}. Check VITE_RAPID_API_KEY in .env.`,
      );
      return null;
    }

    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  const data = await response.json();

  return data;
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim());
  }

  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }

  return [];
};

const uniqueNormalizedList = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [values])
        .map((value) => normalizeText(value))
        .filter(Boolean),
    ),
  );

const inferSecondaryBodyParts = ({ name, target, bodyPart }) => {
  const normalizedName = normalizeText(name);
  const normalizedTarget = normalizeText(target);
  const primary = normalizeText(bodyPart);

  const inferred = new Set();

  if (
    /bench press|chest press|push-up|push up|fly|dip/.test(normalizedName) ||
    normalizedTarget === "pectorals"
  ) {
    inferred.add("chest");
    inferred.add("upper arms");
  }

  if (
    /overhead press|shoulder press|arnold press|lateral raise/.test(
      normalizedName,
    ) ||
    normalizedTarget === "delts"
  ) {
    inferred.add("shoulders");
    inferred.add("upper arms");
  }

  if (
    /row|pulldown|pull-up|pull up|chin-up|chin up/.test(normalizedName) ||
    normalizedTarget === "lats"
  ) {
    inferred.add("back");
    inferred.add("upper arms");
  }

  if (/deadlift/.test(normalizedName)) {
    inferred.add("back");
    inferred.add("upper legs");
    inferred.add("waist");
  }

  if (/squat|lunge|leg press/.test(normalizedName)) {
    inferred.add("upper legs");
    inferred.add("waist");
  }

  inferred.delete(primary);
  return Array.from(inferred);
};

export const getExerciseBodyParts = (exercise) => {
  if (!exercise) {
    return [];
  }

  const explicitBodyParts = uniqueNormalizedList(
    exercise?.bodyParts || exercise?.body_parts || exercise?.muscles,
  );
  const primaryBodyPart = normalizeText(
    exercise?.bodyPart || exercise?.body_part || exercise?.bodypart,
  );

  const merged = uniqueNormalizedList([
    ...explicitBodyParts,
    primaryBodyPart,
    ...inferSecondaryBodyParts({
      name: exercise?.name,
      target: exercise?.target,
      bodyPart: primaryBodyPart,
    }),
  ]);

  return merged;
};

const normalizeId = (exercise) => {
  const candidate =
    exercise?.id ??
    exercise?.exerciseId ??
    exercise?.exercise_id ??
    exercise?._id ??
    exercise?.uuid;

  if (candidate === undefined || candidate === null) {
    return "";
  }

  return String(candidate).trim();
};

const animationIdFromExerciseId = (exerciseId) => {
  const cleanId = String(exerciseId || "").trim();
  if (!cleanId) {
    return "";
  }

  if (/^\d+$/.test(cleanId)) {
    return cleanId.padStart(4, "0");
  }

  return cleanId;
};

export const getExerciseAnimationUrl = (exerciseId) => {
  const animationId = animationIdFromExerciseId(exerciseId);
  if (!animationId) {
    return "";
  }

  return `${EXERCISES11_BASE_URL}/images/${animationId}.gif`;
};

const animationBlobUrlCache = new Map();
const animationRequestCache = new Map();
const animationFailedCache = new Map();
const ANIMATION_FAILED_RETRY_MS = 10 * 60 * 1000;
const ANIMATION_CACHE_NAME = "gymhow-exercise-animations-v1";

const canUseBrowserCache = () =>
  typeof window !== "undefined" && typeof window.caches !== "undefined";

const readAnimationBlobFromPersistentCache = async (cacheKey, animationUrl) => {
  if (!canUseBrowserCache()) {
    return null;
  }

  try {
    const cache = await window.caches.open(ANIMATION_CACHE_NAME);
    const cachedResponse = await cache.match(animationUrl);
    if (!cachedResponse) {
      return null;
    }

    const cachedBlob = await cachedResponse.blob();
    if (!cachedBlob || !cachedBlob.type.startsWith("image/")) {
      return null;
    }

    const blobUrl = URL.createObjectURL(cachedBlob);
    animationBlobUrlCache.set(cacheKey, blobUrl);
    return blobUrl;
  } catch {
    return null;
  }
};

const writeAnimationBlobToPersistentCache = async (animationUrl, blob) => {
  if (!canUseBrowserCache()) {
    return;
  }

  try {
    const cache = await window.caches.open(ANIMATION_CACHE_NAME);
    const responseToCache = new Response(blob, {
      headers: {
        "Content-Type": blob.type || "image/gif",
      },
    });
    await cache.put(animationUrl, responseToCache);
  } catch {
    // Ignore cache write failures and continue with in-memory rendering.
  }
};

export const fetchExerciseAnimationBlobUrl = async (exerciseId) => {
  const cacheKey = String(exerciseId || "").trim();
  if (!cacheKey) {
    return null;
  }

  if (animationBlobUrlCache.has(cacheKey)) {
    return animationBlobUrlCache.get(cacheKey);
  }

  const lastFailedAt = animationFailedCache.get(cacheKey) || 0;
  if (
    lastFailedAt > 0 &&
    Date.now() - lastFailedAt < ANIMATION_FAILED_RETRY_MS
  ) {
    return null;
  }

  if (animationRequestCache.has(cacheKey)) {
    return animationRequestCache.get(cacheKey);
  }

  const animationUrl = getExerciseAnimationUrl(cacheKey);
  if (!animationUrl) {
    return null;
  }

  const persistentBlobUrl = await readAnimationBlobFromPersistentCache(
    cacheKey,
    animationUrl,
  );
  if (persistentBlobUrl) {
    return persistentBlobUrl;
  }

  const requestPromise = (async () => {
    try {
      const response = await fetch(animationUrl, animationOptions);
      if (!response.ok) {
        if (response.status === 429) {
          markApiRateLimited();
        }
        animationFailedCache.set(cacheKey, Date.now());
        return null;
      }

      const blob = await response.blob();
      if (!blob || !blob.type.startsWith("image/")) {
        animationFailedCache.set(cacheKey, Date.now());
        return null;
      }

      await writeAnimationBlobToPersistentCache(animationUrl, blob);

      const blobUrl = URL.createObjectURL(blob);
      animationBlobUrlCache.set(cacheKey, blobUrl);
      animationFailedCache.delete(cacheKey);
      return blobUrl;
    } catch {
      animationFailedCache.set(cacheKey, Date.now());
      return null;
    } finally {
      animationRequestCache.delete(cacheKey);
    }
  })();

  animationRequestCache.set(cacheKey, requestPromise);
  return requestPromise;
};

const normalizeExercise = (exercise) => {
  const id = normalizeId(exercise);

  const name =
    exercise?.name ??
    exercise?.exercise ??
    exercise?.title ??
    exercise?.value ??
    "";
  const bodyPart =
    exercise?.bodyPart ??
    exercise?.body_part ??
    exercise?.bodypart ??
    exercise?.muscleGroup ??
    exercise?.muscle_group ??
    "";
  const target =
    exercise?.target ??
    exercise?.targetMuscle ??
    exercise?.target_muscle ??
    exercise?.muscle ??
    "";
  const equipment =
    exercise?.equipment ??
    exercise?.equipmentType ??
    exercise?.equipment_type ??
    "body weight";

  const rawGifUrl =
    exercise?.gifUrl ??
    exercise?.gif ??
    exercise?.image ??
    exercise?.animation ??
    "";
  const gifUrl =
    typeof rawGifUrl === "string" && /^https?:\/\//i.test(rawGifUrl)
      ? rawGifUrl
      : getExerciseAnimationUrl(id);

  const bodyParts = getExerciseBodyParts({
    ...exercise,
    name,
    target,
    bodyPart,
  });

  return {
    ...exercise,
    id,
    name: String(name || "").trim(),
    bodyPart: bodyParts[0] || String(bodyPart || "").trim().toLowerCase(),
    bodyParts,
    target: String(target || "")
      .trim()
      .toLowerCase(),
    equipment: String(equipment || "")
      .trim()
      .toLowerCase(),
    gifUrl,
    instructions: normalizeList(exercise?.instructions),
  };
};

export const normalizeExercisesResponse = (data) => {
  const sourceList = Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.results)
        ? data.results
        : Array.isArray(data?.exercises)
          ? data.exercises
          : [];

  const normalized = sourceList
    .map((item) => normalizeExercise(item))
    .filter((item) => item.id && item.name);

  const dedupedById = new Map();
  normalized.forEach((exercise) => {
    if (!dedupedById.has(exercise.id)) {
      dedupedById.set(exercise.id, exercise);
    }
  });

  return Array.from(dedupedById.values());
};

export const fetchAllExercises = async () => {
  const data = await fetchData(
    `${EXERCISES11_BASE_URL}/data.json`,
    exerciseOptions,
  );
  return normalizeExercisesResponse(data);
};

export const filterExercisesByQuery = (exercises, query) => {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return Array.isArray(exercises) ? exercises : [];
  }

  if (!Array.isArray(exercises)) {
    return [];
  }

  // Support multi-word searches: match if any token is present (OR logic).
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  return exercises.filter((exercise) => {
    const name = normalizeText(exercise?.name);

    // Single-character queries: prefer prefix match on name
    if (tokens.length === 1 && tokens[0].length === 1) {
      return name.startsWith(tokens[0]);
    }

    const searchable = [
      exercise?.name,
      exercise?.target,
      exercise?.equipment,
      exercise?.bodyPart,
      ...(Array.isArray(exercise?.bodyParts) ? exercise.bodyParts : []),
    ]
      .map((value) => normalizeText(value))
      .join(" ");

    // Return true if any token is included in the searchable string
    return tokens.some((token) => searchable.includes(token));
  });
};

export const getBodyPartsFromExercises = (exercises) => {
  if (!Array.isArray(exercises)) {
    return [];
  }

  return Array.from(
    new Set(
      exercises.flatMap((exercise) => {
        const parts = getExerciseBodyParts(exercise);
        if (parts.length > 0) {
          return parts;
        }

        const fallback = normalizeText(exercise?.bodyPart);
        return fallback ? [fallback] : [];
      }),
    ),
  ).sort((a, b) => a.localeCompare(b));
};

export const findExerciseById = (exercises, id) => {
  if (!Array.isArray(exercises)) {
    return null;
  }

  const targetId = String(id || "").trim();
  if (!targetId) {
    return null;
  }

  return (
    exercises.find((exercise) => String(exercise?.id || "") === targetId) ||
    null
  );
};
