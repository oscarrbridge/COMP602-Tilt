import "./SpecialEvent.css";
interface SpecialEventProps {
    id?: string;
    EventHook: string;
    EventTitle: string;
    EventDescription: string;
    EventImage: string;
    EventLink: string;
}
export default function SpecialEvent({ id, EventHook, EventTitle, EventDescription, EventImage }: SpecialEventProps): import("react/jsx-runtime").JSX.Element;
export {};
