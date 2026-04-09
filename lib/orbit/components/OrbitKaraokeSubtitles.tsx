'use client';

import React, { useState, useEffect, useRef } from 'react';
import styles from '@/styles/Captions.module.css';

interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface OrbitKaraokeSubtitlesProps {
  words: Word[];
  isFinal: boolean;
  isListening: boolean;
}

export function OrbitKaraokeSubtitles({ words, isFinal, isListening }: OrbitKaraokeSubtitlesProps) {
  const [activeWords, setActiveWords] = useState<Word[]>([]);
  const clearTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (words.length > 0) {
      setActiveWords(words);
      
      // Reset clear timer
      if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
      
      // Auto-disappear after 5 seconds of silence
      clearTimerRef.current = setTimeout(() => {
        setActiveWords([]);
      }, 5000);

      // Auto-scroll to end if it overflows
      if (containerRef.current) {
        containerRef.current.scrollLeft = containerRef.current.scrollWidth;
      }
    }
  }, [words]);

  useEffect(() => {
    // If we stop listening, clear subtitles after a short delay
    if (!isListening) {
      const timer = setTimeout(() => setActiveWords([]), 2000);
      return () => clearTimeout(timer);
    }
  }, [isListening]);

  if (activeWords.length === 0) return null;

  return (
    <div className={styles.captionsContainer}>
      <div 
        ref={containerRef}
        className={styles.captionsText}
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          justifyContent: 'flex-start',
          gap: '2px',
          paddingBottom: '4px'
        }}
      >
        {activeWords.map((w, i) => (
          <span 
            key={`${w.word}-${i}-${w.start}`}
            className={styles.karaokeWord}
          >
            {w.word}
          </span>
        ))}
      </div>
    </div>
  );
}
