import { type CSSProperties } from "react";
import { Link, useLocation } from "react-router-dom";
import { EXPERIENCES } from "../experiences";

function Mark() {
  return (
    <svg viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="3" stroke="currentColor" opacity="0.35" />
      <path d="M6 14h16M14 6v16" stroke="currentColor" opacity="0.22" />
      <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 18.5c4-8 15-11 19-4.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PortalNav() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const activeExperience = EXPERIENCES.find((item) => item.path === location.pathname);
  const experienceTheme = activeExperience?.chromeTheme ?? "dark";
  const style = activeExperience
    ? ({ "--portal-experience-accent": activeExperience.accent } as CSSProperties)
    : undefined;

  return (
    <nav
      className={`portal-nav portal-nav--${isHome ? "home" : `experience portal-nav--experience-${experienceTheme}`}`}
      style={style}
    >
      <Link to="/" className="portal-nav__brand" aria-label="Three.js X Space home">
        <Mark />
        <span>Three.js X Space</span>
      </Link>
      {!isHome && activeExperience ? (
        <div className="portal-nav__breadcrumb">
          <span aria-hidden="true">/</span>
          <span>{activeExperience.shortTitle}</span>
        </div>
      ) : null}
      <div className="portal-nav__spacer" />
      {isHome ? (
        <div className="portal-nav__links">
          <a href="#experiments">Experiments</a>
          <a href="https://github.com/cofy-x/threejs-x-space">GitHub</a>
        </div>
      ) : (
        <Link to="/" className="portal-nav__back">
          <span aria-hidden="true">←</span> All experiments
        </Link>
      )}
    </nav>
  );
}
