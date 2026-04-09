'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseWebSpeechReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  isSupported: boolean;
}

export function useWebSpeech(): UseWebSpeechReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)) {
      setIsSupported(true);
    }
  }, []);

  const startListening = useCallback((lang: string = 'en-US') => {
    if (!isSupported) {
      setError('Web Speech API not supported in this browser');
      return;
    }
    if (isListening) return;

    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = lang;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onerror = (event: any) => {
        console.error('Web Speech Error:', event.error);
        setError(`Web Speech error: ${event.error}`);
        // If not-allowed or similar fatal, stop
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
            stopListening();
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTrans += event.results[i][0].transcript;
          } else {
            interimTrans += event.results[i][0].transcript;
          }
        }

        if (finalTrans) {
            setTranscript(prev => prev + ' ' + finalTrans);
        }
        setInterimTranscript(interimTrans);
      };

      recognition.start();
    } catch (err) {
      console.error('Failed to start Web Speech', err);
      setError('Failed to start recording');
    }
  }, [isSupported, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    startListening,
    stopListening,
    isSupported
  };
}
