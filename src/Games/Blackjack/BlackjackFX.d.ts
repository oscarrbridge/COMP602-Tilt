import './BlackjackFX.css';
export type Result = '' | 'win' | 'loss' | 'tie';
export default function BlackjackFX({ result }: {
    result: Result;
}): import("react/jsx-runtime").JSX.Element | null;
