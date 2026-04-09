'use client';

import React from 'react';
import styles from './OrbitSubtitleOverlay.module.css';

interface OrbitSubtitleOverlayProps {
  text: string;
  isVisible: boolean;
}

export function OrbitSubtitleOverlay({ text, isVisible }: OrbitSubtitleOverlayProps) {
  if (!isVisible || !text) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.subtitleBox}>
        <span className={styles.text}>{text}</span>
      </div>
    </div>
  );
}
