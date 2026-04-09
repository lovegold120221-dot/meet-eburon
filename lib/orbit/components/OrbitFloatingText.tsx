import React from 'react';
import styles from '@/styles/OrbitMic.module.css';

interface OrbitFloatingTextProps {
  transcript: string;
  isFinal: boolean;
  isVisible: boolean;
}

export function OrbitFloatingText({ transcript, isFinal, isVisible }: OrbitFloatingTextProps) {
  if (!isVisible && !transcript) return null;

  return (
    <div 
        className={`${styles.orbitFloatingText} ${isVisible ? styles.orbitFloatingTextVisible : ''} ${!isFinal ? styles.orbitFloatingTextInterim : ''}`}
    >
      {transcript.trim() || "\u00A0"}
    </div>
  );
}
