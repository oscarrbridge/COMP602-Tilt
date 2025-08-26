import NavBar from './components/NavBar/NavBar.tsx';
import SpecialEvent from './components/SpecialEvent/SpecialEvent.tsx';
import GameCard from './components/GameCard/GameCard.tsx';
import SearchBar from './components/SearchBar/SearchBar.tsx';
import { AppProvider } from '@toolpad/core/AppProvider';
import { createTheme } from '@mui/material/styles';

import './App.css';

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
  },
];

const PopularGames = [
  {
    Text: 'Slots',
    Image: 'src/assets/Tilt.png',
  },
  {
    Text: 'Slots',
    Image: 'src/assets/Tilt.png',
  },
  {
    Text: 'Slots',
    Image: 'src/assets/Tilt.png',
  },
  {
    Text: 'Slots',
    Image: 'src/assets/Tilt.png',
  },
];

export default function App() {
  return (
    <AppProvider theme={theme}>
      <div className='NavBar'>
        <NavBar />
      </div>

      <div className='SpecialEventsContainer'>
        <div className='SpecialEventsTitle'>
          <h2>Special Events</h2>
        </div>
        <div className='SpecialEvents'>
          {SpecialEvents.map((event, index) => (
            <SpecialEvent key={index} {...event} />
          ))}
        </div>

        <br />

        <div className='PopularGamesContainer'>
          <div className='PopularGamesTitle'>
            <h2>Popular Games</h2>
          </div>
          <div className='PopularGames'>
            {PopularGames.map((game, index) => (
              <GameCard key={index} {...game} />
            ))}
          </div>
        </div>

        <br />

        <div className='HomeSearchBarContainer'>
          <div className='HomeSearchBarTitle'>
            <h2>Looking for a game?</h2>
          </div>
          <div className='HomeSearchBar'>
            <SearchBar Placeholder='Search for a game...' />
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
