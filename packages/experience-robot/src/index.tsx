import { AssemblyProvider } from "./state/assembly";
import { FooterBar, Header } from "./components/chrome";
import { PartsPanel } from "./components/parts-panel";
import { RobotView } from "./components/robot-view";
import "./styles.css";

export function RobotExperience() {
  return (
    <AssemblyProvider>
      <div className="robot-experience">
        <Header />
        <main className="robot-main">
          <RobotView />
          <PartsPanel />
        </main>
        <FooterBar />
      </div>
    </AssemblyProvider>
  );
}
