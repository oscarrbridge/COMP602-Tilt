import { Link } from 'react-router-dom';
import { PopularGames } from '../../../App.tsx';
import './PanelMenu.css';

export default function PanelMenu() {
  // Filter out “Soon” entries
  const availableGames = PopularGames.filter((game) => game.Text !== 'Soon');

  return (
    <div className='panel-menu'>
      <div className='panel-header'>
        <h2>Menu</h2>
      </div>

      <div className='panel-content'>
        <ul>
          <li>
            <Link to='/'>
              <img src='src/assets/tilt.png' alt='Home' className='panel-icon' />
              <span>Home</span>
            </Link>
          </li>

          {availableGames.map((game, index) => (
            <li key={index}>
              <Link to={game.LinkTo}>
                <img src={game.Image} alt={game.Text} className='panel-icon' />
                <span>{game.Text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
