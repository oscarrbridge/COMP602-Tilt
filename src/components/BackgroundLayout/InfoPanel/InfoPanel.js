import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import "./InfoPanel.css";
const InfoPanel = ({ title = "Information", children, }) => {
    return (_jsxs("aside", { className: "info-panel", children: [_jsx("h2", { className: "info-panel-title", children: title }), _jsx("div", { className: "info-panel-content", children: children })] }));
};
export default InfoPanel;
