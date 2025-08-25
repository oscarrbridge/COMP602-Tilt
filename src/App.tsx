import NavBar from './components/NavBar/NavBar.tsx'
import SpecialEvent from './components/SpecialEvent/SpecialEvent.tsx'

import './App.css'

export default function App() {

  return (
    <>
      <div className='NavBar'>
        <NavBar />
      </div>

      <div className='SpecialEventsContainer'>
        <div className='SpecialEventsTitle'>
          <strong><h2>Special Events</h2></strong>
        </div>
        <div className='SpecialEvents'>
          <SpecialEvent
            EventHook='Hook'
            EventTitle='Title'
            EventDescription='Description'
            EventImage='src\assets\Tilt.png'
            EventLink='/'
          />

          <SpecialEvent
            EventHook='Hook'
            EventTitle='Title'
            EventDescription='Description'
            EventImage='src\assets\Tilt.png'
            EventLink='/'
          />

          <SpecialEvent
            EventHook='Hook'
            EventTitle='Title'
            EventDescription='Description'
            EventImage='src\assets\Tilt.png'
            EventLink='/'
          />
        </div>

      </div>
    </>
  )
}
