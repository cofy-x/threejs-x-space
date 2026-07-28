import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ExperienceBoundary } from "./components/experience-boundary";
import { PortalNav } from "./components/portal-nav";
import { EXPERIENCES } from "./experiences";
import { HomePage } from "./pages/home";

const EXPERIENCE_ROUTES = EXPERIENCES.flatMap((experience) => {
  if (experience.status !== "live") return [];
  return [{ ...experience, Component: lazy(experience.load) }];
});

function ExperienceFallback({ theme }: { theme: "dark" | "light" }) {
  return (
    <div className={`experience-fallback experience-fallback--${theme}`} role="status" aria-live="polite">
      <span>Loading the experiment</span>
      <i aria-hidden="true" />
    </div>
  );
}

export function App() {
  return (
    <div className="portal-shell">
      <PortalNav />
      <main className="portal-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          {EXPERIENCE_ROUTES.map(({ id, path, chromeTheme, Component }) => (
            <Route
              key={id}
              path={path}
              element={
                <ExperienceBoundary theme={chromeTheme}>
                  <Suspense fallback={<ExperienceFallback theme={chromeTheme} />}>
                    <Component />
                  </Suspense>
                </ExperienceBoundary>
              }
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
