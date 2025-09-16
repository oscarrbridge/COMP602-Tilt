import "./SpecialEvent.css";
import { useNavigate } from "react-router-dom";

interface SpecialEventProps {
  EventHook: string;
  EventTitle: string;
  EventDescription: string;
  EventImage: string;
  EventLink: string;
}

export default function SpecialEvent({EventHook, EventTitle, EventDescription, EventImage, EventLink}: SpecialEventProps)
{
  const navigate = useNavigate();

  return (
    <article className="SpecialEventCard">
      {/* Badge */}
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

      {/* Width */}
      <button
        className="BottomSection"
        onClick={() => navigate(EventLink)}
        aria-label={`Play ${EventTitle}`}
      >
        Play Now!
      </button>
    </article>
  );
}