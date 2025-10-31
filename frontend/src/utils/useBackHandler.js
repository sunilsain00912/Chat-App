// utils/useBackHandler.js
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Custom hook: Intercepts browser/phone back button.
 * @param {string} fromPath - current route prefix to detect (e.g., "/chat/")
 * @param {string} toPath - fallback route to navigate to (e.g., "/")
 */
export const useBackHandler = (fromPath = "/chat/", toPath = "/") => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handlePopState = (e) => {
      if (location.pathname.startsWith(fromPath)) {
        e.preventDefault();
        navigate(toPath);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [navigate, location, fromPath, toPath]);
};
