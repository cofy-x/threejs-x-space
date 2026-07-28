import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Link } from "react-router-dom";
import { EXPERIENCES, type ExperienceMeta } from "../experiences";

const LIVE_EXPERIENCES = EXPERIENCES.filter((experience) => experience.status === "live");
const SHOWCASE_INTERVAL = 8_000;

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function CollectionItem({ experience }: { experience: ExperienceMeta }) {
  const content = (
    <>
      <span className="lab-item__number">{experience.number}</span>
      <div>
        <h3>{experience.title}</h3>
        <p>{experience.description}</p>
      </div>
      <div className="lab-item__meta">
        <span>{experience.status === "live" ? "Launch experiment" : "In the lab"}</span>
        <span style={{ backgroundColor: experience.accent }} aria-hidden="true" />
      </div>
    </>
  );

  if (experience.status === "live") {
    return (
      <Link to={experience.path} className="lab-item lab-item--link">
        {content}
      </Link>
    );
  }

  return <article className="lab-item">{content}</article>;
}

export function HomePage() {
  const latest = LIVE_EXPERIENCES.at(-1);
  const [featuredIndex, setFeaturedIndex] = useState(Math.max(0, LIVE_EXPERIENCES.length - 1));
  const [autoplayStopped, setAutoplayStopped] = useState(false);
  const [stagePaused, setStagePaused] = useState(false);
  const pointerStart = useRef<number | null>(null);
  const suppressPreviewClickUntil = useRef(0);
  const desktop = useMediaQuery("(min-width: 701px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const featured = LIVE_EXPERIENCES[featuredIndex];

  useEffect(() => {
    if (!desktop || reducedMotion || autoplayStopped || stagePaused || LIVE_EXPERIENCES.length < 2) return;
    const interval = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % LIVE_EXPERIENCES.length);
    }, SHOWCASE_INTERVAL);
    return () => window.clearInterval(interval);
  }, [autoplayStopped, desktop, reducedMotion, stagePaused]);

  if (!featured || !latest) {
    return (
      <div className="collection-empty" role="status">
        <p>New experiments are being prepared.</p>
      </div>
    );
  }

  const Preview = featured.preview;
  const remainingExperiences = EXPERIENCES.filter((experience) => experience.id !== latest.id);
  const selectExperience = (index: number) => {
    setFeaturedIndex((index + LIVE_EXPERIENCES.length) % LIVE_EXPERIENCES.length);
    setAutoplayStopped(true);
  };
  const moveSelection = (direction: -1 | 1) => selectExperience(featuredIndex + direction);
  const handleShowcaseKeys = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    moveSelection(event.key === "ArrowLeft" ? -1 : 1);
  };
  const handlePointerStart = (event: PointerEvent<HTMLAnchorElement>) => {
    pointerStart.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    if (Math.abs(distance) < 48) return;
    pointerStart.current = null;
    suppressPreviewClickUntil.current = performance.now() + 500;
    moveSelection(distance > 0 ? -1 : 1);
  };
  const handlePointerEnd = (event: PointerEvent<HTMLAnchorElement>) => {
    pointerStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const showcaseStyle = { "--showcase-accent": featured.accent } as CSSProperties;

  return (
    <div className="home">
      <section className="home-hero">
        <div className="home-hero__copy">
          <p className="eyebrow">Interactive Three.js experiments</p>
          <h1>
            Small worlds,
            <br />
            <em>built to be played with.</em>
          </h1>
          <p className="home-hero__lede">
            A growing collection of strange machines, visual systems, and tactile ideas built in the browser.
          </p>
          <div className="home-hero__actions">
            <Link to={featured.path} className="button-link button-link--primary">
              Explore {featured.shortTitle} <span aria-hidden="true">↗</span>
            </Link>
            <a href="#experiments" className="button-link">
              View the collection
            </a>
          </div>
          <dl className="home-hero__facts">
            <div>
              <dt>Current experiment</dt>
              <dd>{featured.number}</dd>
            </div>
            <div>
              <dt>Runtime</dt>
              <dd>{featured.runtime}</dd>
            </div>
            <div>
              <dt>Interaction</dt>
              <dd>{featured.interaction}</dd>
            </div>
          </dl>
        </div>
        <div
          className="home-showcase"
          style={showcaseStyle}
          role="region"
          aria-roledescription="carousel"
          aria-label="Featured experiments"
          onMouseEnter={() => setStagePaused(true)}
          onMouseLeave={() => setStagePaused(false)}
          onFocusCapture={() => setStagePaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setStagePaused(false);
          }}
          onKeyDown={handleShowcaseKeys}
        >
          <div className="home-showcase__header">
            <div className="home-showcase__current">
              <span>Now showing</span>
              <strong>
                {featured.number} — {featured.title}
              </strong>
            </div>
            <div className="home-showcase__controls" aria-label="Choose a featured experiment">
              <button type="button" className="home-showcase__arrow" onClick={() => moveSelection(-1)} aria-label="Previous experiment">
                ←
              </button>
              {LIVE_EXPERIENCES.map((experience, index) => (
                <button
                  key={experience.id}
                  type="button"
                  className="home-showcase__index"
                  aria-label={`Show ${experience.number} ${experience.title}`}
                  aria-pressed={index === featuredIndex}
                  onClick={() => selectExperience(index)}
                >
                  {experience.number}
                </button>
              ))}
              <button type="button" className="home-showcase__arrow" onClick={() => moveSelection(1)} aria-label="Next experiment">
                →
              </button>
              <button
                type="button"
                className="home-showcase__toggle"
                aria-label={autoplayStopped ? "Resume automatic rotation" : "Pause automatic rotation"}
                aria-pressed={autoplayStopped}
                onClick={() => setAutoplayStopped((value) => !value)}
              >
                {autoplayStopped ? "Play" : "Pause"}
              </button>
            </div>
          </div>
          <Link
            key={featured.id}
            to={featured.path}
            className="home-hero__visual"
            aria-label={`Open ${featured.title}`}
            draggable={false}
            onPointerDown={handlePointerStart}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onClick={(event) => {
              if (performance.now() < suppressPreviewClickUntil.current) event.preventDefault();
            }}
          >
            {Preview ? <Preview /> : <div className="experience-preview-placeholder">Preview coming soon</div>}
          </Link>
          <p className="home-showcase__hint">Use arrows or numbered controls to explore · Swipe on mobile</p>
        </div>
      </section>

      <section className="collection" id="experiments" aria-labelledby="collection-title">
        <div className="section-heading">
          <p className="eyebrow">The collection</p>
          <h2 id="collection-title">One experiment at a time.</h2>
          <p>Each piece begins with a single visual idea and grows into something you can manipulate, inspect, and replay.</p>
        </div>

        <Link to={latest.path} className="featured-row">
          <span className="featured-row__number">{latest.number}</span>
          <div className="featured-row__body">
            <div className="featured-row__status">
              <span /> Live experiment
            </div>
            <h3>{latest.title}</h3>
            <p>{latest.description}</p>
            <div className="featured-row__tags">
              {latest.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </div>
          </div>
          <span className="featured-row__launch">
            Launch <span aria-hidden="true">↗</span>
          </span>
        </Link>

        {remainingExperiences.length > 0 ? (
          <div className="lab-list" aria-label="More experiments">
            {remainingExperiences.map((experience) => (
              <CollectionItem key={experience.id} experience={experience} />
            ))}
          </div>
        ) : null}
      </section>

      <footer className="home-footer">
        <span>Three.js X Space</span>
        <span>A public Cofy-X experiment collection.</span>
      </footer>
    </div>
  );
}
