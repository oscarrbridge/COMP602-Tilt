import NavBar from './components/NavBar/NavBar';
import SpecialEvent from './components/SpecialEvent/SpecialEvent';
import SpecialEventCreateButton from './components/SpecialEvent/SpecialEventCreateButton';
import GameCard from './components/GameCard/GameCard';
import SearchBar from './components/SearchBar/SearchBar';
import FilterBar from './components/FilterBar/FilterBar';
import { AppProvider } from '@toolpad/core/AppProvider';
import { createTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import SearchGameCard from './components/GameCard/SearchGameCard';
import Footer from '@components/Footer/Footer';

import {
  listenApprovedEvents,
  submitSpecialEvent,
  type NewEventInput,
} from '../Backend/firebase/events';

// Carousel imports
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Slider from 'react-slick';
import type { Settings } from 'react-slick';

import './App.css';
import FriendsDock from '@components/Friends/FriendsOverlay';

const theme = createTheme({ palette: { background: { default: 'var(--background)' } } });

// fallback card (only if zero approved yet)
const DEFAULT_CARD = {
  EventHook: 'Hook',
  EventTitle: 'Title',
  EventDescription: 'Description',
  EventImage: 'src/assets/Tilt.png',
  EventLink: '/',
};

export const PopularGames = [

  { Text: 'Slots',     Image: 'src/assets/slots.png',       LinkTo: '/slots' },
  { Text: 'Blackjack', Image: 'src/assets/blackjack.png',   LinkTo: '/blackjack' },
  { Text: 'Mines',     Image: 'src/assets/mines.png',       LinkTo: '/mines' },
  { Text: 'Coin Toss', Image: 'src/assets/coins.png',       LinkTo: '/cointoss' },
  { Text: 'Roulette', Image: 'src/assets/roulette.png',     LinkTo: '/roulette' },
  { Text: 'Poker',    Image: 'src/assets/poker.png',           LinkTo: '/poker' },
  { Text: 'Crash',    Image: 'src/assets/crash.png',           LinkTo: '/crash' },
];

export const AllGames = [
  { Text: 'Slots',     Image: 'src/assets/slots.png',       LinkTo: '/slots' },
  { Text: 'Blackjack', Image: 'src/assets/blackjack.png',   LinkTo: '/blackjack' },
  { Text: 'Mines',     Image: 'src/assets/mines.png',       LinkTo: '/mines' },
  { Text: 'Coin Toss', Image: 'src/assets/coins.png',       LinkTo: '/cointoss' },
  { Text: 'Roulette', Image: 'src/assets/roulette.png',     LinkTo: '/roulette' },
  { Text: 'Poker', Image: 'src/assets/poker.png',           LinkTo: '/poker' },
  { Text: 'Crash', Image: 'src/assets/crash.png',           LinkTo: '/crash' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
  { Text: 'Soon', Image: 'src/assets/comingsoon.png',       LinkTo: '/' },
];

type SpecialEventRender = {
  id?: string;
  EventHook: string;
  EventTitle: string;
  EventDescription: string;
  EventImage?: string | null;
  EventLink: string;
  createdAt?: number;
};

export default function Dashboard() {
  const [events, setEvents] = useState<SpecialEventRender[]>([]);

  useEffect(() => {
    const unsub = listenApprovedEvents((docs) => {
      const mapped = docs.map((d: any) => ({
        id: d.id,
        EventHook: d.EventHook ?? '',
        EventTitle: d.EventTitle ?? '',
        EventDescription: d.EventDescription ?? '',
        EventImage:
          d.EventImage && d.EventImage.trim() !== '' ? d.EventImage : 'src/assets/Tilt.png',
        EventLink: d.EventLink ?? '/',
        createdAt:
          typeof d.createdAt?.toMillis === 'function' ? d.createdAt.toMillis() : (d.createdAt ?? 0),
      })) as SpecialEventRender[];
      setEvents(mapped);
    });
    return () => unsub();
  }, []);

  const source = events.length ? events : [{ ...DEFAULT_CARD, createdAt: Date.now() }];
  const sorted = useMemo(
    () => [...source].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)),
    [source]
  );

  const baseToShow = 3;
  const count = sorted.length;
  const slidesToShow = Math.min(baseToShow, count);
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
        settings: {
          slidesToShow: Math.min(3, itemsForSlider.length),
          infinite: itemsForSlider.length > Math.min(3, itemsForSlider.length),
        },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: Math.min(2, itemsForSlider.length),
          infinite: itemsForSlider.length > Math.min(2, itemsForSlider.length),
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: Math.min(1, itemsForSlider.length),
          infinite: itemsForSlider.length > Math.min(1, itemsForSlider.length),
        },
      },
    ],
  };

  const addEvent = async (item: NewEventInput) => {
    await submitSpecialEvent(item); // creates PENDING doc
    alert('Submitted for approval.');
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredGames = AllGames.filter((game) =>
    game.Text.toLowerCase().includes(searchTerm.toLowerCase())
  );
  return (
    <AppProvider theme={theme}>
      <NavBar />
      <FriendsDock />

      <div className='SpecialEventsContainer'>
        <h2>Special Events</h2>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          <SpecialEventCreateButton onAdd={addEvent} />
        </div>

        <section className='SpecialEventsFull'>
          <div className='SpecialEventsInside'>
            <Slider key={sliderKey} {...sliderSettings}>
              {itemsForSlider.map((event, i) => (
                <div key={`${event.EventTitle}-${i}`} className='SpecialEventsSlide'>
                  <SpecialEvent
                    id={event.id}
                    EventHook={event.EventHook}
                    EventTitle={event.EventTitle}
                    EventDescription={event.EventDescription}
                    EventImage={event.EventImage ?? ''}
                    EventLink={event.EventLink}
                  />
                </div>
              ))}
            </Slider>
          </div>
        </section>
      </div>

      <div className='GamesContainer'>
        <h2>Popular Games</h2>
        <div className='Games'>
          {PopularGames.map((game, i) => (
            <GameCard key={i} {...game} />
          ))}
        </div>
      </div>
      <br></br>

      <div className='search-bar'>
        <div className='search-category'>
          <span>Casino</span>
          <i className='fa fa-chevron-down'></i>
        </div>
        <div className='search-input'>
          <i className='fa fa-search'></i>
          <input
            type='text'
            placeholder='Search your game'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* All Games section uses filteredGames */}
      <div className='SearchGamesContainer'>
        <br></br>
        <h3>All Games</h3>
        <div className='SearchGames'>
          {filteredGames.map((game, i) => (
            <SearchGameCard key={`all-${i}`} {...game} />
          ))}
        </div>
      </div>


      
      <div className="Footer">
          <Footer />
      </div>

    </AppProvider>
  );
}
