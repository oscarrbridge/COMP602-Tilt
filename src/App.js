import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
import { listenApprovedEvents, submitSpecialEvent, } from '../Backend/firebase/events';
// Carousel imports
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import Slider from 'react-slick';
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
    { Text: 'Slots', Image: 'src/assets/slots.png', LinkTo: '/slots' },
    { Text: 'Blackjack', Image: 'src/assets/blackjack.png', LinkTo: '/blackjack' },
    { Text: 'Mines', Image: 'src/assets/mines.png', LinkTo: '/mines' },
    { Text: 'Coin Toss', Image: 'src/assets/coins.png', LinkTo: '/cointoss' },
    { Text: 'Roulette', Image: 'src/assets/roulette.png', LinkTo: '/roulette' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
];
export const AllGames = [
    { Text: 'Slots', Image: 'src/assets/slots.png', LinkTo: '/slots' },
    { Text: 'Blackjack', Image: 'src/assets/blackjack.png', LinkTo: '/blackjack' },
    { Text: 'Mines', Image: 'src/assets/mines.png', LinkTo: '/mines' },
    { Text: 'Coin Toss', Image: 'src/assets/coins.png', LinkTo: '/cointoss' },
    { Text: 'Roulette', Image: 'src/assets/roulette.png', LinkTo: '/roulette' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Slots', Image: 'src/assets/slots.png', LinkTo: '/slots' },
    { Text: 'Blackjack', Image: 'src/assets/blackjack.png', LinkTo: '/blackjack' },
    { Text: 'Mines', Image: 'src/assets/mines.png', LinkTo: '/mines' },
    { Text: 'Coin Toss', Image: 'src/assets/coins.png', LinkTo: '/cointoss' },
    { Text: 'Roulette', Image: 'src/assets/roulette.png', LinkTo: '/roulette' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Soon', Image: 'src/assets/comingsoon.png', LinkTo: '/' },
    { Text: 'Slots', Image: 'src/assets/slots.png', LinkTo: '/slots' },
];
export default function Dashboard() {
    const [events, setEvents] = useState([]);
    useEffect(() => {
        const unsub = listenApprovedEvents((docs) => {
            const mapped = docs.map((d) => ({
                id: d.id,
                EventHook: d.EventHook ?? '',
                EventTitle: d.EventTitle ?? '',
                EventDescription: d.EventDescription ?? '',
                EventImage: d.EventImage && d.EventImage.trim() !== '' ? d.EventImage : 'src/assets/Tilt.png',
                EventLink: d.EventLink ?? '/',
                createdAt: typeof d.createdAt?.toMillis === 'function' ? d.createdAt.toMillis() : (d.createdAt ?? 0),
            }));
            setEvents(mapped);
        });
        return () => unsub();
    }, []);
    const source = events.length ? events : [{ ...DEFAULT_CARD, createdAt: Date.now() }];
    const sorted = useMemo(() => [...source].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)), [source]);
    const baseToShow = 3;
    const count = sorted.length;
    const slidesToShow = Math.min(baseToShow, count);
    const needsDup = count <= slidesToShow;
    const itemsForSlider = needsDup ? [...sorted, ...sorted] : sorted;
    const infinite = itemsForSlider.length > slidesToShow;
    const sliderKey = `${itemsForSlider.length}-${slidesToShow}-${infinite}`;
    const sliderSettings = {
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
    const addEvent = async (item) => {
        await submitSpecialEvent(item); // creates PENDING doc
        alert('Submitted for approval.');
    };
    const [searchTerm, setSearchTerm] = useState('');
    const filteredGames = AllGames.filter((game) => game.Text.toLowerCase().includes(searchTerm.toLowerCase()));
    return (_jsxs(AppProvider, { theme: theme, children: [_jsx(NavBar, {}), _jsx(FriendsDock, {}), _jsxs("div", { className: 'SpecialEventsContainer', children: [_jsx("h2", { children: "Special Events" }), _jsx("div", { style: { display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }, children: _jsx(SpecialEventCreateButton, { onAdd: addEvent }) }), _jsx("section", { className: 'SpecialEventsFull', children: _jsx("div", { className: 'SpecialEventsInside', children: _jsx(Slider, { ...sliderSettings, children: itemsForSlider.map((event, i) => (_jsx("div", { className: 'SpecialEventsSlide', children: _jsx(SpecialEvent, { id: event.id, EventHook: event.EventHook, EventTitle: event.EventTitle, EventDescription: event.EventDescription, EventImage: event.EventImage ?? '', EventLink: event.EventLink }) }, `${event.EventTitle}-${i}`))) }, sliderKey) }) })] }), _jsxs("div", { className: 'GamesContainer', children: [_jsx("h2", { children: "Popular Games" }), _jsx("div", { className: 'Games', children: PopularGames.map((game, i) => (_jsx(GameCard, { ...game }, i))) })] }), _jsx("br", {}), _jsxs("div", { className: 'search-bar', children: [_jsxs("div", { className: 'search-category', children: [_jsx("span", { children: "Casino" }), _jsx("i", { className: 'fa fa-chevron-down' })] }), _jsxs("div", { className: 'search-input', children: [_jsx("i", { className: 'fa fa-search' }), _jsx("input", { type: 'text', placeholder: 'Search your game', value: searchTerm, onChange: (e) => setSearchTerm(e.target.value) })] })] }), _jsxs("div", { className: 'SearchGamesContainer', children: [_jsx("br", {}), _jsx("h3", { children: "All Games" }), _jsx("div", { className: 'SearchGames', children: filteredGames.map((game, i) => (_jsx(SearchGameCard, { ...game }, `all-${i}`))) })] }), _jsxs("div", { className: 'HomeSearchBarContainer', children: [_jsx("h2", { children: "Looking for a game?" }), _jsx(SearchBar, { Placeholder: 'Search for a game...' }), _jsx(FilterBar, {}), _jsx("div", { className: 'Footer', children: _jsx(Footer, {}) })] })] }));
}
