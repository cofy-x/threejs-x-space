import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface ExperienceBoundaryProps {
  children: ReactNode;
  theme: "dark" | "light";
}

interface ExperienceBoundaryState {
  hasError: boolean;
}

export class ExperienceBoundary extends Component<ExperienceBoundaryProps, ExperienceBoundaryState> {
  override state: ExperienceBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ExperienceBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("The experience failed to load.", error, info);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className={`experience-error experience-error--${this.props.theme}`} role="alert">
          <p>Experience unavailable</p>
          <h1>This experiment could not be loaded.</h1>
          <span>Reload the page to try again, or return to the collection.</span>
          <div>
            <button type="button" onClick={() => window.location.reload()}>
              Reload experiment
            </button>
            <Link to="/">Return to collection</Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
