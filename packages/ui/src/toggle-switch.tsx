export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel?: string;
}

export function ToggleSwitch({ checked, onChange, ariaLabel }: ToggleSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel ?? "Toggle"}
      onClick={() => onChange(!checked)}
      style={{
        width: 46,
        height: 24,
        borderRadius: 12,
        border: "none",
        cursor: "pointer",
        padding: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: checked ? "flex-end" : "flex-start",
        backgroundColor: checked ? "#22c55e" : "#475569",
        transition: "background-color 150ms ease",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: "#f8fafc",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.4)",
        }}
      />
    </button>
  );
}
