import { EngineView } from "./components/engine-view";
import { FooterBar } from "./components/footer-bar";
import { Header } from "./components/header";
import { RightPanel } from "./components/right-panel";
import { SimulationProvider } from "./state/simulation";
import "./styles.css";

export function TurbofanExperience() {
  return (
    <SimulationProvider>
      <div className="turbofan-experience">
        <Header />
        <div className="app-main">
          <EngineView />
          <RightPanel />
        </div>
        <FooterBar />
      </div>
    </SimulationProvider>
  );
}
