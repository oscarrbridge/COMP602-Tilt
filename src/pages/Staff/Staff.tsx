import './Staff.css';
import NavBar from '@components/NavBar/NavBar';
import { useState } from 'react';
import Footer from '@components/Footer/Footer';

export default function Staff() {
  const [code, setCode] = useState('');

  function GenarateCode() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    setCode(result);

    return result;
  }

  return (
    <>
      <NavBar />

      <div className='genBoxContainer'>
        <div className='genBox'>
          <h2>Press to get a random code</h2>
          <input type='text' value={code} readOnly></input>
          <button onClick={GenarateCode}>Generate</button>
        </div>
      </div>

      <Footer />
    </>
  );
}
