
// src/App.tsx
import NavBar from "./components/NavBar/NavBar";
import SpecialEvent from "./components/SpecialEvent/SpecialEvent";
import SpecialEventCreateButton from "./components/SpecialEvent/SpecialEventCreateButton";
import type { SpecialEventItem } from "./components/SpecialEvent/ComponentType";
import GameCard from "./components/GameCard/GameCard";
import SearchBar from "./components/SearchBar/SearchBar";
import FilterBar from "./components/FilterBar/FilterBar";
import { AppProvider } from "@toolpad/core/AppProvider";
import { createTheme } from "@mui/material/styles";
import { useMemo } from "react";
import { useLocalStorage } from "./hooks/StoreSpecialEvent";

// Carousel imports
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import type { Settings } from "react-slick";


import "./App.css";

// Styling theme
const theme = createTheme({
  palette: {
    background: {
      default: 'var(--background)',
    },
  },
});

// Required npm packages: react-router-dom

const SpecialEvents = [
  {
    EventHook: 'Hook',
    EventTitle: 'Title',
    EventDescription: 'Description',
    EventImage: 'src/assets/Tilt.png',
    EventLink: '/',
  },
  {
    EventHook: 'Hook',
    EventTitle: 'Title',
    EventDescription: 'Description',
    EventImage: 'src/assets/Tilt.png',
    EventLink: '/',
  },
  {
    EventHook: 'Hook',
    EventTitle: 'Title',
    EventDescription: 'Description',
    EventImage: 'src/assets/Tilt.png',
    EventLink: '/',
   }
  ];  
// Special Events data
const DEFAULT_EVENTS: SpecialEventItem[] = [
  {
    EventHook: "Hook",
    EventTitle: "Title",
    EventDescription: "Description",
    EventImage: "src/assets/Tilt.png",
    EventLink: "/",
  },
]; 

// Popular games data
export const PopularGames = [
  {
    Text: 'Slots',
    Image: 'src/assets/icon-slots.png',
    LinkTo: '/slots',
  },
  {
    Text: 'Blackjack',
    Image: 'src/assets/icon-blackjack.png',
    LinkTo: '/blackjack',
  },
  {
    Text: 'Mines',
    Image: 'src/assets/icon-bomb.png',
    LinkTo: '/mines',
  },
  {
    Text: 'Coin Toss',
    Image: 'src/assets/Tilt.png',
  },
];

export default function Dashboard() {
  // Events fomr local storage
  const [events, setEvents] = useLocalStorage<SpecialEventItem[]>(
    "specialEvents",
    DEFAULT_EVENTS
  );

  const addEvent = (item: SpecialEventItem) =>
    setEvents((prev) => [item, ...prev]);

  // Sorts events
  const sorted = useMemo(
    () => [...events].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [events]
  );

  // Carousel
  const baseToShow = 3; 
  const count = sorted.length;
  const slidesToShow = Math.min(baseToShow, count);

  // Duplicate if not enough to loop smoothly
  const needsDup = count <= slidesToShow;
  const itemsForSlider = needsDup ? [...sorted, ...sorted] : sorted;
  const infinite = itemsForSlider.length > slidesToShow;
  const sliderKey = `${itemsForSlider.length}-${slidesToShow}-${infinite}`;

  const sliderSettings: Settings = {
    dots: true,
    arrows: true,
    infinite,
    speed: 500,
    slidesToShow,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    pauseOnHover: true,
    centerMode: false,
    adaptiveHeight: false,
    variableWidth: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: (() => {
          const show = Math.min(3, itemsForSlider.length);
          return { slidesToShow: show, infinite: itemsForSlider.length > show };
        })(),
      },
      {
        breakpoint: 900,
        settings: (() => {
          const show = Math.min(2, itemsForSlider.length);
          return { slidesToShow: show, infinite: itemsForSlider.length > show };
        })(),
      },
      {
        breakpoint: 600,
        settings: (() => {
          const show = Math.min(1, itemsForSlider.length);
          return { slidesToShow: show, infinite: itemsForSlider.length > show };
        })(),
      },
    ],
  };

  // Clear button handler
  const handleClearAll = () => {
    if (!confirm("Clear all special events?")) return;
    localStorage.removeItem("specialEvents");
    setEvents(DEFAULT_EVENTS); 
  };
  return (
    <AppProvider theme={theme}>
        <NavBar />

      <div className="SpecialEventsContainer">
        <h2>Special Events</h2>

        {/* Controls row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <SpecialEventCreateButton onAdd={addEvent} />
          <button
            onClick={handleClearAll}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #888",
              background: "#222",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Clear All Events
          </button>
        </div>

        {/* Carousel */}
        <section className="SpecialEventsFull">
          <div className="SpecialEventsInside">
            <Slider key={sliderKey} {...sliderSettings}>
              {itemsForSlider.map((event, i) => (
                <div key={`${event.EventTitle}-${i}`} className="SpecialEventsSlide">
                  <SpecialEvent {...event} />
                </div>
              ))}
            </Slider>
          </div>
        </section>
      </div>

      <div className="GamesContainer">
        <h2>Popular Games</h2>
        <div className="Games">
          {PopularGames.map((game, i) => (
            <GameCard key={i} {...game} />
          ))}
        </div>
      </div>

      <div className="HomeSearchBarContainer">
        <h2>Looking for a game?</h2>
        <SearchBar Placeholder="Search for a game..." />
      </div>

      <FilterBar />
    </AppProvider>
  );
}