import { useEffect, useMemo, useState } from 'react';
import './BlackjackFX.css';

export type Result = '' | 'win' | 'loss' | 'tie';

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export default function BlackjackFX({ result }: { result: Result }) {
  const [nonce, setNonce] = useState(0);

  const model = useMemo(() => {
    if (!result) return null;

    // rainbow confetti w/ different arc radii
    const confetti = range(48).map((i) => {
      const angle = (i / 48) * Math.PI * 2 + Math.random() * 0.3;
      const radius = 70 + Math.random() * 110;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * (radius * 0.6);
      const rot = (Math.random() * 320 + 80) * (Math.random() > 0.5 ? 1 : -1);
      const delay = i * 6 + Math.random() * 140;
      const hue = Math.floor(Math.random() * 360);
      return { x, y, rot, delay, hue };
    });

    // bright chip burst (more pieces + deeper spread)
    const chips = range(22).map((i) => {
      const angle = (i / 22) * Math.PI * 2 + Math.random() * 0.6;
      const dx = Math.cos(angle) * (70 + Math.random() * 110);
      const dy = -80 - Math.random() * 140;
      const z = Math.random() * 60;
      const delay = i * 10 + Math.random() * 80;
      return { dx, dy, z, delay };
    });

    // rotating light beams on win
    const beams = range(8);

    // loss shards + “crack” overlay
    const shards = range(28).map((i) => ({ delay: i * 22 + Math.random() * 90 }));

    return { confetti, chips, beams, shards };
  }, [result]);

  useEffect(() => {
    if (result) setNonce((n) => n + 1);
  }, [result]);

  if (!result || !model) return null;

  return (
    <div key={nonce} className={`bj-fx bj-fx--${result}`} aria-hidden>
      {/* global vignettes / flashes */}
      <div className='bj-fx__vignette' />
      {result === 'loss' && <div className='bj-fx__flash' />}

      {/* WIN layers */}
      {result === 'win' && (
        <>
          {/* shockwave ring */}
          <div className='bj-fx__ring' />

          {/* rotating beams */}
          <div className='bj-fx__beams'>
            {model.beams.map((i) => (
              <span key={i} style={{ ['--i' as any]: i }} />
            ))}
          </div>

          {/* coin/chip burst */}
          <div className='bj-fx__chips'>
            {model.chips.map((c, i) => (
              <span
                key={i}
                style={
                  {
                    '--dx': `${c.dx}px`,
                    '--dy': `${c.dy}px`,
                    '--dz': `${c.z}px`,
                    '--delay': `${c.delay}ms`,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* rainbow confetti w/ motion trails */}
          <div className='bj-fx__confetti'>
            {model.confetti.map((c, i) => (
              <span
                key={i}
                style={
                  {
                    '--x': `${c.x}px`,
                    '--y': `${c.y}px`,
                    '--rot': `${c.rot}deg`,
                    '--delay': `${c.delay}ms`,
                    '--hue': c.hue,
                  } as React.CSSProperties
                }
              />
            ))}
          </div>

          {/* sparkle dust */}
          <div className='bj-fx__sparkle'>
            {range(18).map((i) => (
              <i key={i} style={{ ['--d' as any]: `${i * 70}ms` }} />
            ))}
          </div>

          {/* subtle chroma fringe on table */}
          <div className='bj-fx__chroma' />
        </>
      )}

      {/* LOSS layers */}
      {result === 'loss' && (
        <>
          <div className='bj-fx__crack' />
          <div className='bj-fx__shards'>
            {model.shards.map((s, i) => (
              <span key={i} style={{ ['--delay' as any]: `${s.delay}ms` }} />
            ))}
          </div>
          <div className='bj-fx__smoke' />
        </>
      )}

      {/* TIE shimmer */}
      {result === 'tie' && <div className='bj-fx__sheen' />}
    </div>
  );
}
