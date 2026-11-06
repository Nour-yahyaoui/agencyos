'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';

// Keep the WebGPU renderer out of the rest of the app and load it only when supported.
const AeroShards = dynamic(() => import('./aero-shards'), { ssr: false });

export function LandingBackground() {
  const [enabled, setEnabled] = useState(false);
  const [failed, setFailed] = useState(false);
  const [lightMode, setLightMode] = useState(true);

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setEnabled('gpu' in navigator && !motion.matches);
    const updateTheme = () => setLightMode(document.documentElement.dataset.theme !== 'dark');
    const themeObserver = new MutationObserver(updateTheme);

    updateMotion();
    updateTheme();
    motion.addEventListener('change', updateMotion);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      motion.removeEventListener('change', updateMotion);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <div aria-hidden="true" data-testid="landing-background" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* A quiet, static fallback is also visible beneath the transparent WebGPU canvas. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_75%_22%,rgba(168,85,247,0.11),transparent_48%),radial-gradient(ellipse_at_20%_75%,rgba(124,92,191,0.08),transparent_45%)]" />
      {enabled && !failed && (
        <AeroShards
          shardColor="#7c5cbf"
          accentColor="#a855f7"
          placement="full"
          material="glass"
          markers="plus"
          count={1300}
          depthOfField={0.75}
          vignette={0.3}
          mouseInteraction
          pulseOnClick
          holdToGather
          lightMode={lightMode}
          shardSize={1}
          spread={1}
          twist={1}
          billow={1}
          speed={1}
          scale={1}
          glow={0.35}
          grain={0.06}
          intro
          mouseStrength={0.6}
          parallax={0.5}
          paused={false}
          dpr={1.5}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
