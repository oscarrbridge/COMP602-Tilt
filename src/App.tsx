
import NavBar from "./components/NavBar/NavBar.tsx";
import SpecialEvent from "./components/SpecialEvent/SpecialEvent.tsx";
import GameCard from "./components/GameCard/GameCard.tsx";
import SearchBar from "./components/SearchBar/SearchBar.tsx";
import FilterBar from "./components/FilterBar/FilterBar.tsx"
import { AppProvider } from "@toolpad/core/AppProvider";
import { createTheme } from "@mui/material/styles";
// Carousel Slider Import
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import Slider from "react-slick";
import type { Settings } from "react-slick";

import "./App.css";
import { Filter } from "@mui/icons-material";

// Styling theme
const theme = createTheme({
  palette: {
    background: {
      default: "var(--background)",
    },
  },
});


const SpecialEvents = [
  {
    EventHook: "Hook",
    EventTitle: "Title",
    EventDescription: "Description",
    EventImage: "src/assets/Tilt.png",
    EventLink: "/",
  },
  {
    EventHook: "Hook",
    EventTitle: "Title",
    EventDescription: "Description",
    EventImage: "src/assets/Tilt.png",
    EventLink: "/",
  },
  {
    EventHook: "Hook",
    EventTitle: "Title",
    EventDescription: "Description",
    EventImage: "src/assets/Tilt.png",
    EventLink: "/",
  },
  {
    EventHook: "Hook",
    EventTitle: "Title",
    EventDescription: "Description",
    EventImage: "src/assets/Tilt.png",
    EventLink: "/",
  },
];

export const PopularGames = [
  {
    Text: "Slots",
    Image: "src/assets/Tilt.png",
    LinkTo: "/slots",
  },
  {
    Text: "Blackjack",
    Image: "src/assets/Tilt.png",
    LinkTo: "/blackjack",
  },
  {
    Text: "Mines",
    Image: "src/assets/Tilt.png",
    LinkTo: "/mines",
  },
  {
    Text: "Coming Soon",
    Image: "src/assets/Future.png",
  },
];

export default function Dashboard() {
  // Carousel setting changes
  const sliderSettings: Settings = {
    dots: true,
    arrows: true,
    infinite: true,
    speed: 500,
    slidesToShow: 3,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3500,
    pauseOnHover: true,
    centerMode: false,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 3,
        },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <AppProvider theme={theme}>
      <div className="NavBar">
        <NavBar />
      </div>

      <div className="SpecialEventsContainer">
        <div className="SpecialEventsTitle">
          <h2>Special Events</h2>
        </div>

        {/* Carousel slider*/}
        <section className="SpecialEventsFull">
          <div className="SpecialEventsInside">
            <Slider {...sliderSettings}>
              {SpecialEvents.map((event, index) => (
                <div key={index} className="SpecialEventsSlide">
                  <SpecialEvent {...event} />
                </div>
              ))}
            </Slider>
          </div>
        </section>

        <br />

        <div className="GamesContainer">
          <div className="GamesTitle">
            <h2>Popular Games</h2>
          </div>

          <div className="Games">
            {PopularGames.map((game, index) => (
              <GameCard key={index} {...game} />
            ))}
          </div>
        </div>

        <br />

        <div className="HomeSearchBarContainer">
          <div className="HomeSearchBarTitle">
            <h2>Looking for a game?</h2>
          </div>
          <div className="HomeSearchBar">
            <SearchBar Placeholder="Search for a game..." />
          </div>
        </div>

        <div className="FilterBarContainer">
          <div className="FilterBar">
            <FilterBar />
          </div>
        </div>


      </div>
    </AppProvider>
  );
}