"use client";

import { useEffect } from "react";

/**
 * Blocks browser-level navigation (refresh, tab close, browser back/forward)
 * while `isBlocked` is true.
 *
 * In-app navigation is blocked by the fullscreen AiLoader overlay which
 * intercepts all pointer events.
 */
export const useNavigationGuard = (
  isBlocked: boolean,
  message = "작업이 진행 중입니다. 페이지를 벗어나면 작업이 중단됩니다.",
) => {
  useEffect(() => {
    if (!isBlocked) return;

    // Block browser refresh / tab close
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    // Block browser back/forward button by pushing a dummy history entry
    // and re-pushing it whenever popstate fires
    window.history.pushState(null, "", window.location.pathname);
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isBlocked, message]);
};
