// src/components/Confetti.js
"use client";

import { useCallback, forwardRef, useImperativeHandle, useRef } from "react";
import { Particles } from "react-tsparticles";
import { loadFull } from "tsparticles";

// eslint-disable-next-line react/display-name
const Confetti = forwardRef((props, ref) => {
  const particlesRef = useRef();

  const particlesInit = useCallback(async (engine) => {
    await loadFull(engine);
  }, []);

  // Expose la fonction launchConfetti via ref
  useImperativeHandle(ref, () => ({
    launchConfetti() {
      if (particlesRef.current) {
        particlesRef.current.refresh(); // recharge les particules pour lancer les confettis
      }
    },
  }));

  const confettiOptions = {
    particles: {
      number: {
        value: 100,
      },
      shape: {
        type: "circle",
      },
      size: {
        value: { min: 2, max: 6 },
      },
      move: {
        enable: true,
        speed: 6,
      },
    },
  };

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      options={confettiOptions}
      ref={particlesRef}
    />
  );
});

export default Confetti;