'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Room } from 'livekit-client';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import styles from '@/styles/Captions.module.css';

export type TranscriptSegment = {
  text: string;
  source: 'microphone' | 'screen' | 'auto';
  timestamp: number;
  isFinal: boolean;
  language?: string;
};

type LiveCaptionsProps = {
  room?: Room;
  enabled: boolean;
  vadEnabled: boolean;
  broadcastEnabled: boolean;
  language: string;
  audioSource: 'auto' | 'microphone' | 'screen';
  onTranscriptSegment?: (segment: TranscriptSegment) => void;
};

export function LiveCaptions({
  room,
  enabled,
  language,
  onTranscriptSegment,
}: LiveCaptionsProps) {
  const [caption, setCaption] = useState('');
  const dgConnectionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (!enabled) {
      setCaption('');
      if (dgConnectionRef.current) {
        dgConnectionRef.current.finish();
        dgConnectionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      return;
    }

    const startDeepgram = async () => {
      try {
        const response = await fetch('/api/deepgram/token');
        const { key } = await response.json();
        if (!key) throw new Error('Failed to get Deepgram key');

        const deepgram = createClient(key);
        const connection = deepgram.listen.live({
          model: 'nova-2',
          language: language === 'auto' || language === 'multi' ? undefined : language,
          detect_language: language === 'auto' || language === 'multi' ? true : undefined,
          interim_results: true,
          smart_format: true,
        });

        dgConnectionRef.current = connection;

        connection.on(LiveTranscriptionEvents.Open, async () => {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
          mediaRecorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0 && connection.getReadyState() === 1) {
              connection.send(event.data);
            }
          };

          recorder.start(250);
        });

        connection.on(LiveTranscriptionEvents.Transcript, (data) => {
          const transcript = data.channel.alternatives[0]?.transcript;
          if (transcript) {
            setCaption(transcript);
            if (data.is_final) {
              onTranscriptSegment?.({
                text: transcript,
                source: 'microphone',
                timestamp: Date.now(),
                isFinal: true,
              });
              // Auto-clear after a brief delay if it's final
              setTimeout(() => setCaption(''), 3000);
            }
          }
        });

        connection.on(LiveTranscriptionEvents.Close, () => {
          console.log('Deepgram connection closed');
        });

        connection.on(LiveTranscriptionEvents.Error, (err) => {
          console.error('Deepgram error:', err);
        });
      } catch (error) {
        console.error('Failed to start Deepgram:', error);
      }
    };

    startDeepgram();

    return () => {
      if (dgConnectionRef.current) {
        dgConnectionRef.current.finish();
        dgConnectionRef.current = null;
      }
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
    };
  }, [enabled, onTranscriptSegment, language]);

  if (!enabled || !caption) return null;

  return (
    <div className={styles.captionsContainer}>
      <div className={styles.captionsText}>
        {caption}
      </div>
    </div>
  );
}
