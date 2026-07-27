import { Link } from "react-router-dom";
import { EXPERIENCES, type ExperienceMeta } from "../experiences";

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
  const featured = EXPERIENCES.find((experience) => experience.status === "live");

  if (!featured) {
    return (
      <div className="collection-empty" role="status">
        <p>New experiments are being prepared.</p>
      </div>
    );
  }

  const Preview = featured.preview;
  const remainingExperiences = EXPERIENCES.filter((experience) => experience.id !== featured.id);

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
        <Link to={featured.path} className="home-hero__visual" aria-label={`Open ${featured.title}`}>
          {Preview ? <Preview /> : <div className="experience-preview-placeholder">Preview coming soon</div>}
        </Link>
      </section>

      <section className="collection" id="experiments" aria-labelledby="collection-title">
        <div className="section-heading">
          <p className="eyebrow">The collection</p>
          <h2 id="collection-title">One experiment at a time.</h2>
          <p>Each piece begins with a single visual idea and grows into something you can manipulate, inspect, and replay.</p>
        </div>

        <Link to={featured.path} className="featured-row">
          <span className="featured-row__number">{featured.number}</span>
          <div className="featured-row__body">
            <div className="featured-row__status">
              <span /> Live experiment
            </div>
            <h3>{featured.title}</h3>
            <p>{featured.description}</p>
            <div className="featured-row__tags">
              {featured.tags.map((tag) => (
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
