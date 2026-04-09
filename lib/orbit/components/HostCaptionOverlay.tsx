'use client';

import React, { useEffect, useRef } from 'react';
import styles from '@/styles/HostCaptionOverlay.module.css';
import { HostCaptionRenderer, WordToken } from '../utils/HostCaptionRenderer';

interface HostCaptionOverlayProps {
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
  isFinal: boolean;
  isListening: boolean;
  analyser?: AnalyserNode | null;
  simulation?: boolean;
}

export function HostCaptionOverlay({ 
  words, 
  isFinal, 
  isListening, 
  analyser,
  simulation = false 
}: HostCaptionOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<HostCaptionRenderer | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new HostCaptionRenderer(containerRef.current);
    renderer.init();
    renderer.setBoxClass(styles.captionText);
    rendererRef.current = renderer;

    if (simulation) {
      renderer.setSimulation(true);
    }

    // Attempt to get AudioContext from analyser if available
    const audioContext = analyser?.context as AudioContext | undefined;
    renderer.start(audioContext);

    return () => {
      renderer.stop();
    };
  }, [analyser, simulation]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.update(words as WordToken[], isFinal);
    }
  }, [words, isFinal]);

  useEffect(() => {
    if (!isListening && rendererRef.current) {
      rendererRef.current.clear();
    }
  }, [isListening]);

  return (
    <div className={styles.overlayContainer} ref={containerRef}>
      <div className={styles.captionBox}>
        {/* Renderer will inject textBox here */}
      </div>
    </div>
  );
}
