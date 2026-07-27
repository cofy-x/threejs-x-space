import type { HTMLAttributes, ReactNode } from "react";

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
}

export function Panel({ title, children, style, ...rest }: PanelProps) {
  return (
    <div
      style={{
        padding: 16,
        borderRadius: 8,
        backgroundColor: "rgba(17, 24, 39, 0.85)",
        color: "#f9fafb",
        fontFamily: "system-ui, sans-serif",
        ...style,
      }}
      {...rest}
    >
      {title ? <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h3> : null}
      {children}
    </div>
  );
}
