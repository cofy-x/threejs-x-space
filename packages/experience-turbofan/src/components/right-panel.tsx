import { Button, Gauge, TimeSeriesChart } from "@threejs-x-space/ui";
import { useSimulation } from "../state/simulation";

const X_TICK_COUNT = 6;

function formatClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function RightPanel() {
  const {
    phase,
    values,
    history,
    casingVisible,
    airflowVisible,
    start,
    pause,
    toggleCasing,
    toggleAirflow,
  } = useSimulation();

  const firstSample = history.length > 0 ? history[0] : undefined;
  const lastSample = history.length > 0 ? history[history.length - 1] : undefined;
  const xLabels =
    firstSample && lastSample
      ? Array.from({ length: X_TICK_COUNT }, (_, i) =>
          formatClock(firstSample.t + ((lastSample.t - firstSample.t) * i) / (X_TICK_COUNT - 1)),
        )
      : undefined;

  return (
    <aside className="right-panel">
      <div className="panel right-panel__section">
        <span className="right-panel__section-title">Engine instruments</span>
        <div className="right-panel__gauges-large">
          <Gauge
            label="RPM"
            value={values.n1}
            min={0}
            max={13000}
            valueText={`N1: ${Math.round(values.n1).toLocaleString("en-US")}`}
            subText={`N2: ${Math.round(values.n2).toLocaleString("en-US")}`}
            size={140}
          />
          <Gauge
            label="THRUST"
            value={values.thrust}
            min={0}
            max={40000}
            valueText={`${Math.round(values.thrust).toLocaleString("en-US")} lbf`}
            size={140}
          />
        </div>
        <div className="right-panel__gauges-small">
          <Gauge
            label="TIT"
            value={values.tit}
            min={0}
            max={1600}
            valueText={`${Math.round(values.tit)}°C`}
            size={100}
          />
          <Gauge
            label="PRESS RATIO"
            value={values.pressureRatio}
            min={0}
            max={35}
            valueText={`${values.pressureRatio.toFixed(1)}: 1`}
            size={100}
          />
          <Gauge
            label="FUEL FLOW"
            value={values.fuelFlow}
            min={0}
            max={180}
            valueText={`${values.fuelFlow.toFixed(1)}`}
            unit="kg/min"
            size={100}
          />
        </div>
      </div>

      {history.length === 0 ? (
        <div className="panel right-panel__standby">
          <span className="right-panel__standby-index">01</span>
          <div>
            <span className="right-panel__section-title">Ready for ignition</span>
            <h2>Bring the engine to life.</h2>
            <p>Start the simulation to spool the fan, ignite the combustor, and trace thrust as it builds.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="panel right-panel__section right-panel__section--chart">
            <TimeSeriesChart
              title="THRUST vs TIME"
              series={[
                {
                  label: "Thrust (lbf)",
                  color: "#5cc6e8",
                  values: history.map((sample) => sample.thrust),
                  fill: true,
                },
              ]}
              xLabels={xLabels}
              fillHeight
            />
          </div>

          <div className="panel right-panel__section right-panel__section--chart">
            <TimeSeriesChart
              title="RPM/TIT vs TIME"
              series={[
                { label: "N1 RPM", color: "#f07a4f", values: history.map((sample) => sample.n1) },
                {
                  label: "TIT",
                  color: "#5cc6e8",
                  values: history.map((sample) => sample.tit),
                  axis: "right",
                  fill: true,
                },
              ]}
              xLabels={xLabels}
              fillHeight
            />
          </div>
        </>
      )}

      <div className="right-panel__buttons">
        <Button variant="primary" onClick={start} disabled={phase !== "stopped"}>
          Start Engine
        </Button>
        <Button variant="danger" onClick={pause} disabled={phase === "stopped"}>
          {phase === "paused" ? "Resume" : "Pause"}
        </Button>
        <Button variant="secondary" onClick={toggleCasing}>
          Casing {casingVisible ? "On" : "Off"}
        </Button>
        <Button variant="outline" onClick={toggleAirflow}>
          Airflow {airflowVisible ? "On" : "Off"}
        </Button>
      </div>
    </aside>
  );
}
