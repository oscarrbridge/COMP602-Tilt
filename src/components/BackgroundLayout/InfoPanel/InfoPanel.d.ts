import React from "react";
import "./InfoPanel.css";
interface InfoPanelProps {
    title?: string;
    children: React.ReactNode;
}
declare const InfoPanel: React.FC<InfoPanelProps>;
export default InfoPanel;
