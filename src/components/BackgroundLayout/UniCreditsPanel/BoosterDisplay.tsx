import { useEffect, useRef } from "react";
import gsap from "gsap";
import "./BoosterDisplay.css";

interface BoosterDisplayProps {
  multiplier: number | null;
}

export default function BoosterDisplay({ multiplier }: BoosterDisplayProps) {
  const iconRef = useRef<HTMLDivElement>(null);
  const flipTween = useRef<gsap.core.Tween | null>(null);

  const isActive = multiplier && multiplier > 1;

  useEffect(() => {
    if (!iconRef.current) return;

    // Initialize flip tween once
    if (!flipTween.current) {
      flipTween.current = gsap.to(iconRef.current, {
        rotationY: "+=360",
        duration: 0.3, // fast spin
        repeat: -1,
        repeatDelay: 2.7, // one spin every ~3s
        ease: "power1.inOut",
        paused: true,
      });
    }

    if (isActive) {
      flipTween.current.play();
    } else {
      flipTween.current.pause(0);
      gsap.set(iconRef.current, { rotationY: 0 });
    }
  }, [isActive]);

  return (
    <div
      className={`booster-display-item ${isActive ? "selected" : ""}`}
      style={{ width: "120px", flexDirection: "column", alignItems: "center" }}
    >
      <div className="booster-display-icon" ref={iconRef}>
        {isActive ? multiplier : 1}x
      </div>
      <div className="active-booster-display">
        {isActive ? "Active Booster" : "No Booster"}
      </div>
    </div>
  );
}
