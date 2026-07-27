import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "outline";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  outlineColor?: string;
  children: ReactNode;
}

const VARIANT_STYLES: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    backgroundColor: "var(--ui-primary-bg, rgba(34, 211, 238, 0.15))",
    border: "1px solid var(--ui-primary-border, #22d3ee)",
    color: "var(--ui-primary-ink, #67e8f9)",
  },
  secondary: {
    backgroundColor: "var(--ui-secondary-bg, rgba(100, 116, 139, 0.2))",
    border: "1px solid var(--ui-secondary-border, #64748b)",
    color: "var(--ui-secondary-ink, #cbd5e1)",
  },
  danger: {
    backgroundColor: "var(--ui-danger-bg, rgba(153, 27, 27, 0.35))",
    border: "1px solid var(--ui-danger-border, #b91c1c)",
    color: "var(--ui-danger-ink, #fca5a5)",
  },
  outline: {
    backgroundColor: "transparent",
    border: "1px solid var(--ui-outline-border, #f97316)",
    color: "var(--ui-outline-ink, #fdba74)",
  },
};

export function Button({ variant = "primary", outlineColor, children, style, ...rest }: ButtonProps) {
  const variantStyle = VARIANT_STYLES[variant];
  const resolvedStyle: React.CSSProperties = {
    padding: "8px 16px",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    textTransform: "uppercase",
    fontFamily: "inherit",
    transition: "filter 120ms ease",
    ...variantStyle,
    ...(variant === "outline" && outlineColor
      ? { border: `1px solid ${outlineColor}`, color: outlineColor }
      : {}),
    ...(rest.disabled ? { opacity: 0.4, cursor: "not-allowed" } : {}),
    ...style,
  };

  return (
    <button style={resolvedStyle} {...rest}>
      {children}
    </button>
  );
}
