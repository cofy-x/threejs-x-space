import { useEffect, useReducer, useState } from "react";
import { initialLabState, labReducer } from "./lab";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches,
  );
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);
  return matches;
}

export function useLab() {
  const [state, dispatch] = useReducer(labReducer, undefined, initialLabState);
  const running = Boolean(state.procedure) && !state.paused;
  useEffect(() => {
    if (!running) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const seconds = (now - previous) / 1000;
      previous = now;
      if (!document.hidden) dispatch({ type: "tick", seconds });
    }, 80);
    return () => window.clearInterval(timer);
  }, [running]);
  return { state, dispatch };
}
