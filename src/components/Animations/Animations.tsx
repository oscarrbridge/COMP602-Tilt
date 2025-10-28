import React, { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import './Animations.css';

type ResultType = 'win' | 'loss';

interface ResultFXProps {
  show: boolean;
  type: ResultType;
  amount?: number;
  currency?: string; // "$", "€", etc
  durationMs?: number; // defaults: 2200
  onDone?: () => void;
  align?: 'center' | 'top' | 'bottom';
}

const formatAmount = (amt?: number, currency = '$') =>
  amt == null ? '' : `${currency}${Math.round(amt).toLocaleString()}`;

export default function ResultFX({
  show,
  type,
  amount,
  currency = '$',
  durationMs = 2200,
  onDone,
  align = 'center',
}: ResultFXProps) {
  // refs to target bits
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const coreRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLDivElement | null>(null);
  const amountRef = useRef<HTMLDivElement | null>(null);
  const burstRef = useRef<HTMLDivElement | null>(null);
  const layerARef = useRef<HTMLDivElement | null>(null);
  const layerBRef = useRef<HTMLDivElement | null>(null);
  const layerCRef = useRef<HTMLDivElement | null>(null);

  // split title into letters for staggered blast
  const title = type === 'win' ? 'WIN!' : 'LOSS';
  const letters = useMemo(() => title.split(''), [title]);

  // Keep your visibility class logic
  const cls = useMemo(() => {
    const base = ['resultfx-wrap', `align-${align}`];
    if (show) base.push('visible');
    base.push(type === 'win' ? 'win' : 'loss');
    return base.join(' ');
  }, [show, align, type]);

  // GSAP timeline on show
  useEffect(() => {
    if (!show) return;

    const wrap = wrapRef.current;
    const core = coreRef.current;
    const burst = burstRef.current;
    const titleEl = titleRef.current;
    const amountEl = amountRef.current;
    const a = layerARef.current;
    const b = layerBRef.current;
    const c = layerCRef.current;

    if (!wrap || !core || !titleEl) return;

    // Prep states (overriding CSS transitions for entrance)
    gsap.set(wrap, { opacity: 1, scale: 1 });
    gsap.set(core, { transformPerspective: 1000, transformOrigin: '50% 60%' });

    // Create per-letter spans target
    const letterNodes = Array.from(titleEl.querySelectorAll('.rf-letter')) as HTMLElement[];

    // Initial letter states
    gsap.set(letterNodes, {
      opacity: 0,
      y: 30,
      rotationX: 70,
      rotationY: gsap.utils.random(-18, 18, 1),
      scale: 0.8,
      transformOrigin: '50% 80% -20px',
    });

    // Amount (optional odometer style)
    let amountTween: gsap.core.Tween | null = null;
    if (amountEl && typeof amount === 'number') {
      const obj = { v: 0 };
      amountTween = gsap.to(obj, {
        v: amount,
        duration: Math.min(1.2, durationMs / 1800),
        ease: 'expo.out',
        onUpdate: () => {
          amountEl.textContent = formatAmount(obj.v, currency);
        },
      });
    }

    // Particle layers: punch alpha to emphasize CSS keyframe particles
    if (a && b && c) {
      gsap.fromTo([a, b, c], { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      gsap.to([a, b, c], { opacity: 0, delay: 0.6, duration: 0.6, ease: 'power2.in' });
    }

    // Burst ring pop
    if (burst) {
      gsap.fromTo(
        burst,
        { opacity: 0, scale: 0.4, filter: 'blur(24px)' },
        { opacity: 0.9, scale: 1.05, filter: 'blur(10px)', duration: 0.35, ease: 'back.out(1.8)' }
      );
      gsap.to(burst, { opacity: 0, scale: 1.2, duration: 0.6, ease: 'power3.in', delay: 0.35 });
    }

    // Title 3D blast (staggered letters)
    const isWin = type === 'win';
    const tl = gsap.timeline({
      defaults: { ease: 'back.out(1.7)' },
      onComplete: () => {
        onDone?.();
      },
    });

    tl.addLabel('start');

    tl.to(
      letterNodes,
      {
        opacity: 1,
        y: 0,
        rotationX: 0,
        scale: 1,
        duration: 0.6,
        stagger: 0.05,
      },
      'start+=0.02'
    );

    // Core “thump” (scale punch + tilt settle)
    tl.fromTo(
      core,
      { scale: 0.96, rotationX: isWin ? 10 : 6, rotationZ: isWin ? 0 : -2 },
      {
        scale: 1.06,
        rotationX: 0,
        rotationZ: 0,
        duration: 0.35,
        ease: 'power3.out',
      },
      'start+=0.02'
    ).to(core, { scale: 1.0, duration: 0.25, ease: 'power2.inOut' }, '>-0.05');

    // Glow pulse for wins / camera shake for losses
    if (isWin) {
      tl.to(
        letterNodes,
        {
          textShadow:
            '0 0 12px rgba(255,255,255,.65), 0 0 26px rgba(255,220,100,.75), 0 12px 30px rgba(0,0,0,.45)',
          duration: 0.3,
          yoyo: true,
          repeat: 1,
          ease: 'sine.inOut',
        },
        'start+=0.32'
      );
    } else {
      tl.to(
        wrap,
        {
          x: 0,
          y: 0,
          duration: 0.45,
          ease: 'power1.inOut',
          onStart: () => {
            // micro-shakes
            gsap.fromTo(
              wrap,
              { x: -3, y: 1 },
              {
                x: 3,
                y: -2,
                yoyo: true,
                repeat: 6,
                duration: 0.06,
                ease: 'sine.inOut',
              }
            );
          },
        },
        'start+=0.28'
      );
    }

    // Soft fade-out of the whole overlay toward the end
    const total = Math.max(1.2, durationMs / 1000);
    tl.to(
      wrap,
      {
        opacity: 0,
        duration: 0.35,
        ease: 'power2.in',
      },
      `start+=${Math.max(0.6, total - 0.4)}`
    );

    return () => {
      tl.kill();
      amountTween?.kill();
      gsap.killTweensOf([wrap, core, burst, letterNodes, a, b, c, amountEl]);
    };
  }, [show, type, amount, currency, durationMs, onDone]);

  return (
    <div ref={wrapRef} className={cls} aria-live='polite' aria-atomic='true'>
      <div ref={burstRef} className='resultfx-burst' />
      <div ref={coreRef} className='resultfx-core'>
        {/* 3D main word – split into letters for GSAP stagger */}
        <div ref={titleRef} className='resultfx-title' role='status' aria-label={title}>
          {letters.map((ch, i) => (
            <span className='rf-letter' key={`${ch}-${i}`}>
              {ch}
            </span>
          ))}
        </div>

        {/* amount line (optional) – content will be animated if present */}
        {amount != null && (
          <div ref={amountRef} className='resultfx-amount'>
            {formatAmount(0, currency)}
          </div>
        )}
      </div>

      {/* particle layers (pure CSS) */}
      <div ref={layerARef} className='resultfx-layer layer-a' />
      <div ref={layerBRef} className='resultfx-layer layer-b' />
      <div ref={layerCRef} className='resultfx-layer layer-c' />
    </div>
  );
}
