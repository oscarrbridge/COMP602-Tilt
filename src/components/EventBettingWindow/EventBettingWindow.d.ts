import "./EventBettingWindow.css";
interface EventBettingWindowProps {
    isOpen: boolean;
    onClose: () => void;
    eventId: string;
    eventTitle: string;
    eventDescription: string;
}
export default function EventBettingWindow({ isOpen, onClose, eventId, eventTitle, eventDescription, }: EventBettingWindowProps): import("react").ReactPortal | null;
export {};
