import type React from "react";
import type CardExplorerPlugin from "../main";

interface CardExplorerPlaceholderProps {
  plugin: CardExplorerPlugin;
}

export const CardExplorerPlaceholder: React.FC<CardExplorerPlaceholderProps> = ({ plugin }) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        padding: "20px",
        textAlign: "center",
        color: "var(--text-muted)",
      }}
    >
      <h3>Card Explorer</h3>
      <p>React components are ready to be mounted.</p>
      <p>Main CardView component will be implemented in upcoming tasks.</p>
      <small>
        Plugin loaded with settings: Auto-start {plugin.settings.autoStart ? "enabled" : "disabled"}
      </small>
    </div>
  );
};
