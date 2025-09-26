import React from "react";
import "./InfoPanel.css";

interface InfoPanelProps {
  title?: string;
  children: React.ReactNode;
}

const InfoPanel: React.FC<InfoPanelProps> = ({
  title = "Information",
  children,
}) => {
  return (
    <aside className="info-panel">
      <h2 className="info-panel-title">{title}</h2>
      <div className="info-panel-content">{children}</div>
    </aside>
  );
};

export default InfoPanel;
