import "./SpecialEvent.css";
import { useState } from "react";
import EventBettingWindow from "../EventBettingWindow/EventBettingWindow";

interface SpecialEventProps {
  id?: string;
  EventHook: string;
  EventTitle: string;
  EventDescription: string;
  EventImage: string;
  EventLink: string; // Keep for backward compatibility, but won't be used
}

export default function SpecialEvent({id, EventHook, EventTitle, EventDescription, EventImage}: SpecialEventProps)
{
  const [isBettingWindowOpen, setIsBettingWindowOpen] = useState(false);

  const handlePlayClick = () => {
    setIsBettingWindowOpen(true);
  };

  return (
    <>
      <article className="SpecialEventCard">
        {/* Hook */}
        <div className="EventHook">{EventHook}</div>

        {/* Left Text and Image */}
        <div className="SpecialEventBody">
          <div className="EventText">
            <h3 className="EventTitle">{EventTitle}</h3>
            <p className="EventDesc">{EventDescription}</p>
          </div>

          <div className="SpecialEventsImage">
            <img src={EventImage} alt={EventTitle} loading="lazy" />
          </div>
        </div>

        {/* Play Button */}
        <button
          className="BottomSection"
          onClick={handlePlayClick}
          aria-label={`Play ${EventTitle}`}
        >
          Play Now!
        </button>
      </article>

      {/* Betting Window Modal */}
      {id && (
        <EventBettingWindow
          isOpen={isBettingWindowOpen}
          onClose={() => setIsBettingWindowOpen(false)}
          eventId={id}
          eventTitle={EventTitle}
          eventDescription={EventDescription}
        />
      )}
    </>
  );
}