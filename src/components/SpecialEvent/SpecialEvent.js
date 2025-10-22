import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import "./SpecialEvent.css";
import { useState } from "react";
import EventBettingWindow from "../EventBettingWindow/EventBettingWindow";
export default function SpecialEvent({ id, EventHook, EventTitle, EventDescription, EventImage }) {
    const [isBettingWindowOpen, setIsBettingWindowOpen] = useState(false);
    const handlePlayClick = () => {
        setIsBettingWindowOpen(true);
    };
    return (_jsxs(_Fragment, { children: [_jsxs("article", { className: "SpecialEventCard", children: [_jsx("div", { className: "EventHook", children: EventHook }), _jsxs("div", { className: "SpecialEventBody", children: [_jsxs("div", { className: "EventText", children: [_jsx("h3", { className: "EventTitle", children: EventTitle }), _jsx("p", { className: "EventDesc", children: EventDescription })] }), _jsx("div", { className: "SpecialEventsImage", children: _jsx("img", { src: EventImage, alt: EventTitle, loading: "lazy" }) })] }), _jsx("button", { className: "BottomSection", onClick: handlePlayClick, "aria-label": `Play ${EventTitle}`, children: "Play Now!" })] }), id && (_jsx(EventBettingWindow, { isOpen: isBettingWindowOpen, onClose: () => setIsBettingWindowOpen(false), eventId: id, eventTitle: EventTitle, eventDescription: EventDescription }))] }));
}
