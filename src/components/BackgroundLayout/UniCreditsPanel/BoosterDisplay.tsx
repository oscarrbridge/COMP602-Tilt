import { useEffect, useRef } from "react";
import gsap from "gsap";
import "./BoosterDisplay.css";

interface BoosterDisplayProps {
  multiplier: number | null;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export default function BoosterDisplay({
  multiplier,
  selected = false,
  disabled = false,
  onClick,
}: BoosterDisplayProps) {
  const boosterRef = useRef<HTMLButtonElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const flipTween = useRef<GSAPTween>();

  useEffect(() => {
    if (!boosterRef.current || !iconRef.current) return;

    // Reset animations
    if (flipTween.current) flipTween.current.kill();
    gsap.set(iconRef.current, { rotationY: 0 });

    if (multiplier && multiplier > 1) {
      // Fast flip every 2 seconds
      flipTween.current = gsap.to(iconRef.current, {
        rotationY: "+=360",
        duration: 0.4, // quick flip
        repeat: -1,
        repeatDelay: 1.6, // total ~2s per flip
        ease: "power2.inOut",
      });

      // Pop in animation when booster becomes active
      gsap.fromTo(
        boosterRef.current,
        { scale: 0.9, opacity: 0.7 },
        { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
    } else {
      // Static idle look for 1x
      gsap.to(boosterRef.current, {
        scale: 1,
        opacity: 0.8,
        duration: 0.4,
        ease: "power1.out",
      });
    }
  }, [multiplier]);

  return (
    <button
      className={`booster-display-item ${selected ? "selected" : ""}`}
      disabled={disabled}
      onClick={onClick}
      ref={boosterRef}
    >
      <div className="booster-display-icon" ref={iconRef}>
        {multiplier ?? 1}x
      </div>
      <span>
        {multiplier && multiplier > 1 ? "Booster Active" : "No Booster"}
      </span>
    </button>
  );
}
