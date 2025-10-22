import type { NewEventInput } from "../../../Backend/firebase/events";
interface Props {
    onAdd: (item: NewEventInput) => Promise<void>;
}
export default function SpecialEventCreateButton({ onAdd }: Props): import("react/jsx-runtime").JSX.Element;
export {};
