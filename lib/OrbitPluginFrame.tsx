'use client';

import React from 'react';
import styles from '@/styles/Eburon.module.css';
import { OrbitApp } from '@/lib/orbit/OrbitApp';

interface OrbitPluginFrameProps {
  isOpen: boolean;
}

export function OrbitPluginFrame({ isOpen }: OrbitPluginFrameProps) {
  return (
    <div
      className={`${styles.orbitOverlay} ${isOpen ? styles.orbitOverlayVisible : ''}`}
      aria-hidden={!isOpen}
    >
      <OrbitApp />
    </div>
  );
}
