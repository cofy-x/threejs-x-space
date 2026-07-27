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

function ExperienceFallback() {
  return (
    <div className="experience-fallback" role="status" aria-live="polite">
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
          {EXPERIENCE_ROUTES.map(({ id, path, Component }) => (
            <Route
              key={id}
              path={path}
              element={
                <ExperienceBoundary>
                  <Suspense fallback={<ExperienceFallback />}>
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
