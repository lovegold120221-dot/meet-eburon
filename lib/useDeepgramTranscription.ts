'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { createClient, LiveTranscriptionEvents, LiveClient } from '@deepgram/sdk';

interface TranscriptionResult {
  transcript: string;
  isFinal: boolean;
  confidence: number;
}

interface UseDeepgramTranscriptionOptions {
  apiKey?: string;
  language?: string;
  model?: string;
  onTranscript?: (result: TranscriptionResult) => void;
  onSpeechStart?: () => void;
  onSpeechEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseDeepgramTranscriptionReturn {
  isListening: boolean;
  isConnecting: boolean;
  transcript: string;
  interimTranscript: string;
  audioLevel: number;
  error: string | null;
  startListening: (deviceId?: string, customStream?: MediaStream) => Promise<void>;
  startStreamListening: (url: string) => Promise<void>;
  stopListening: () => void;
}

export function useDeepgramTranscription(
  options: UseDeepgramTranscriptionOptions = {}
): UseDeepgramTranscriptionReturn {
  const {
    language = 'multi',
    model = 'nova-2',
    onTranscript,
    onSpeechStart,
    onSpeechEnd,
    onError,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<LiveClient | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamReaderRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  // Fetch Deepgram token from server
  const fetchDeepgramToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/deepgram/token');
      if (!response.ok) {
        throw new Error('Failed to get Deepgram token');
      }
      const data = await response.json();
      return data.token || data.key;
    } catch (err) {
      console.error('Error fetching Deepgram token:', err);
      setError('Failed to get transcription token');
      return null;
    }
  }, []);

  const startListening = useCallback(async (deviceId?: string, customStream?: MediaStream) => {
    if (isListening || isConnecting) return;

    setIsConnecting(true);
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    try {
      // Get API key from server
      const apiKey = await fetchDeepgramToken();
      if (!apiKey) {
        throw new Error('No Deepgram API key available');
      }

      let stream: MediaStream;
      if (customStream) {
        stream = customStream;
      } else {
        // Get microphone stream
        const constraints: MediaStreamConstraints = {
          audio: deviceId
            ? { deviceId: { exact: deviceId } }
            : true,
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      }
      streamRef.current = stream;

      // Create Deepgram client and connection
      const deepgram = createClient(apiKey);
      
      const connection = deepgram.listen.live({
        model,
        language: language === 'auto' || language === 'multi' ? undefined : language,
        detect_language: language === 'auto' || language === 'multi' ? true : undefined,
        interim_results: true,
        utterance_end_ms: 1000,
        endpointing: 500,
        punctuate: true,
        vad_events: true,
        smart_format: true,
      });

      connectionRef.current = connection;

      // Set up event handlers
      connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('[Deepgram] Connection opened');
        setIsConnecting(false);
        setIsListening(true);

        // Start MediaRecorder to capture audio
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        };

        mediaRecorder.start(250); // Send audio every 250ms

        // Set up audio level analyzer
        const audioContext = new AudioContext();
        audioContextRef.current = audioContext;
        const source = audioContext.createMediaStreamSource(stream);
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.8;
        source.connect(analyzer);
        analyzerRef.current = analyzer;

        const dataArray = new Uint8Array(analyzer.frequencyBinCount);
        const updateLevel = () => {
          if (!analyzerRef.current) return;
          analyzerRef.current.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(avg / 255);
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
        const alt = data.channel?.alternatives?.[0];
        if (!alt) return;

        const text = alt.transcript;
        if (!text) return;

        const result: TranscriptionResult = {
          transcript: text,
          isFinal: data.is_final ?? false,
          confidence: alt.confidence ?? 0,
        };

        if (data.is_final) {
          setTranscript((prev) => (prev ? `${prev} ${text}` : text));
          setInterimTranscript('');
        } else {
          setInterimTranscript(text);
        }

        onTranscript?.(result);
      });

      connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
        console.log('[Deepgram] Speech started');
        onSpeechStart?.();
      });

      connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        console.log('[Deepgram] Utterance end');
        onSpeechEnd?.();
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('[Deepgram] Connection closed');
        setIsListening(false);
        setIsConnecting(false);
      });

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('[Deepgram] Error:', err);
        setError('Transcription error occurred');
        onError?.(err as Error);
        setIsListening(false);
        setIsConnecting(false);
      });

    } catch (err) {
      console.error('Error starting transcription:', err);
      setError((err as Error).message || 'Failed to start transcription');
      onError?.(err as Error);
      setIsConnecting(false);
    }
  }, [isListening, isConnecting, fetchDeepgramToken, model, language, onTranscript, onSpeechStart, onSpeechEnd, onError]);

  const startStreamListening = useCallback(async (url: string) => {
    if (isListening || isConnecting) return;

    setIsConnecting(true);
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    try {
      const apiKey = await fetchDeepgramToken();
      if (!apiKey) throw new Error('No Deepgram API key available');

      const deepgram = createClient(apiKey);
      const connection = deepgram.listen.live({
        model,
        language: language === 'auto' || language === 'multi' ? undefined : language,
        detect_language: language === 'auto' || language === 'multi' ? true : undefined,
        interim_results: true,
        utterance_end_ms: 1000,
        endpointing: 500,
        punctuate: true,
        smart_format: true,
      });

      connectionRef.current = connection;

      connection.on(LiveTranscriptionEvents.Open, async () => {
        console.log('[Deepgram] Connection opened for stream');
        setIsConnecting(false);
        setIsListening(true);
        
        try {
          const response = await fetch(url);
          if (!response.body) throw new Error('No response body');
          
          const reader = response.body.getReader();
          streamReaderRef.current = reader;

          const pump = async () => {
             // Check if we should stop
             if (!connectionRef.current) return;
             
             try {
               const { done, value } = await reader.read();
               if (done) return;
               
               if (connection.getReadyState() === 1) {
                 connection.send(value.buffer);
               }
               pump();
             } catch (e) {
               console.error('Error reading stream:', e);
             }
          };
          pump();
        } catch (err) {
           console.error('Error fetching stream:', err);
           setError('Failed to fetch audio stream');
           stopListening();
        }
      });

      connection.on(LiveTranscriptionEvents.Transcript, (data) => {
         const alt = data.channel?.alternatives?.[0];
         if (alt && alt.transcript) {
            const result: TranscriptionResult = {
              transcript: alt.transcript,
              isFinal: data.is_final ?? false,
              confidence: alt.confidence ?? 0,
            };
            
            if (data.is_final) {
               setTranscript((prev) => (prev ? `${prev} ${alt.transcript}` : alt.transcript));
               setInterimTranscript('');
            } else {
               setInterimTranscript(alt.transcript);
            }
            onTranscript?.(result);
         }
      });

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('[Deepgram] Error:', err);
        setError('Transcription error occurred');
        onError?.(err as Error);
        stopListening();
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
         setIsListening(false);
         setIsConnecting(false);
      });

    } catch (err) {
      console.error('Error starting stream transcription:', err);
      setError('Failed to start stream');
      setIsConnecting(false);
    }
  }, [isListening, isConnecting, fetchDeepgramToken, model, language, onTranscript, onError]);

  const stopListening = useCallback(() => {
    // Stop animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyzerRef.current = null;
    setAudioLevel(0);

    // Stop MediaRecorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // Close Deepgram connection
    if (connectionRef.current) {
      connectionRef.current.requestClose();
      connectionRef.current = null;
    }

    setIsListening(false);
    setIsConnecting(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    isConnecting,
    transcript,
    interimTranscript,
    audioLevel,
    error,
    startListening,
    startStreamListening,
    stopListening,
  };
}

export default useDeepgramTranscription;
