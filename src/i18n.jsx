import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en", // Default language if detection fails
    debug: true, // Set to false in production
    detection: {
      // Language detection options
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
    backend: {
      // Translations live in public/i18n and are fetched at runtime
      loadPath: "/i18n/{{lng}}.json",
    },
    interpolation: {
      escapeValue: false, // React already does escaping
    },
    react: {
      // Render with fallback keys until the JSON loads (no Suspense boundary in the app)
      useSuspense: false,
    },
  });

export default i18n;
