import NavBar from './components/NavBar/NavBar.tsx'
import SpecialEvent from './components/SpecialEvent/SpecialEvent.tsx'
import GameCard from './components/GameCard/GameCard.tsx'


import './App.css'

const SpecialEvents = [
  {
    EventHook: 'Hook',
    EventTitle: 'Title',
    EventDescription: 'Description',
    EventImage: 'src/assets/Tilt.png',
    EventLink: '/'
  },
  {
    EventHook: 'Hook',
    EventTitle: 'Title',
    EventDescription: 'Description',
    EventImage: 'src/assets/Tilt.png',
    EventLink: '/'
  },
  {
    EventHook: 'Hook',
    EventTitle: 'Title',
    EventDescription: 'Description',
    EventImage: 'src/assets/Tilt.png',
    EventLink: '/'
  }
]

const PopularGames = [
  {
    Text: 'Slots',
    Image: 'src/assets/Tilt.png'
  },
  {
    Text: 'Slots',
    Image: 'src/assets/Tilt.png'
  },
  {
    Text: 'Slots',
    Image: 'src/assets/Tilt.png'
  },
  {
    Text: 'Slots',
    Image: 'src/assets/Tilt.png'
  },

]

export default function App() {

  return (
    <>
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

      </div>
    </>
  )
}
