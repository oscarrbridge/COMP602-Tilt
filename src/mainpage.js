import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
export default function MainPage() {
    return (_jsxs("div", { style: { textAlign: "center", marginTop: "100px" }, children: [_jsx("p", { children: "Click below to play Mines!" }), _jsx(Link, { to: "/mines", children: _jsx("button", { style: {
                        padding: "12px 24px",
                        fontSize: "18px",
                        borderRadius: "10px",
                        backgroundColor: "#b38619",
                        color: "#111",
                        border: "none",
                        cursor: "pointer"
                    }, children: "Play Mines Game" }) })] }));
}
