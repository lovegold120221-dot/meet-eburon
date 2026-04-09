import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { createPCM16Blob } from '../services/audioUtils';

export type UseGeminiLiveOptions = {
  /**
   * Backward compatible default is "stt".
   * - stt: mic -> input transcription only
   * - translate_tts: mic -> translate via system instruction -> audio response + output transcription
   */
  mode?: 'stt' | 'translate_tts';
  /** Override the model if needed */
  model?: string;
  /** Override system instruction */
  systemInstruction?: string;
  /** Used only when mode === 'translate_tts' and systemInstruction is not provided */
  targetLanguage?: string;
};

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [outputTranscription, setOutputTranscription] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');

  const sessionRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const currentTranscriptionRef = useRef('');
  const currentOutputTranscriptionRef = useRef('');

  const stopRecording = useCallback(() => {
    // 1. Disconnect the processor
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch (e) {}
      processorRef.current = null;
    }

    // 2. Stop all microphone tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // 3. Safely close the AudioContext
    if (audioContextRef.current) {
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }

    // 4. Close the Gemini session if it exists
    if (sessionRef.current) {
      sessionRef.current.then((session) => {
        try {
          if (typeof session.close === 'function') session.close();
        } catch (e) {}
      });
      sessionRef.current = null;
    }

    setIsRecording(false);
    setStatus('idle');
  }, []);

  const startRecording = useCallback(
    async (customStream?: MediaStream) => {
      // Prevent multiple concurrent recording attempts
      if (status === 'connecting' || isRecording) return;

      setStatus('connecting');
      try {
        const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
        if (!apiKey) {
          console.error('No Gemini API key found');
          setStatus('error');
          return;
        }

        const ai = new GoogleGenAI({ apiKey });

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        let stream: MediaStream;
        if (customStream) {
          stream = customStream;
        } else {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        streamRef.current = stream;

        // Reset accumulated text each new start
        currentTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';
        setTranscription('');
        setOutputTranscription('');

        const mode = options.mode ?? 'stt';
        const model = options.model ?? 'gemini-2.5-flash-native-audio-preview-12-2025';

        const defaultSttInstruction = 'Transcribe the user audio accurately. Do not reply, just transcribe.';
        const defaultTranslatorInstruction =
          `You are Orbit Translator.\n` +
          `Rules:\n` +
          `- Translate ONLY. Do not add commentary, labels, or extra info.\n` +
          `- Preserve meaning, names, numbers, acronyms, and tone.\n` +
          `- Output spoken audio ONLY as the translation (no labels).\n` +
          `TARGET LANGUAGE: ${options.targetLanguage ?? 'English'}\n`;

        const systemInstruction =
          options.systemInstruction ?? (mode === 'translate_tts' ? defaultTranslatorInstruction : defaultSttInstruction);

        const sessionPromise = ai.live.connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],

            // ✅ STT (input)
            inputAudioTranscription: {},

            // ✅ Transcription of model's spoken audio
            outputAudioTranscription: {},

            systemInstruction,
          },
          callbacks: {
            onopen: () => {
              console.log('Gemini Live session opened');
              setStatus('connected');
              setIsRecording(true);

              const source = audioContext.createMediaStreamSource(stream);

              // ScriptProcessor is deprecated but compatible. For production, AudioWorklet is preferred.
              const processor = audioContext.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              // Prevent feedback/echo: keep processor running but mute output.
              const zeroGain = audioContext.createGain();
              zeroGain.gain.value = 0;

              processor.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                const pcmBlob = createPCM16Blob(inputData);

                sessionPromise.then((session) => {
                  // Ensure session is still the active one before sending
                  if (sessionRef.current === sessionPromise) {
                    session.sendRealtimeInput({
                      media: { mimeType: 'audio/pcm;rate=16000', data: pcmBlob },
                    });
                  }
                });
              };

              source.connect(processor);
              processor.connect(zeroGain);
              zeroGain.connect(audioContext.destination);
            },

            onmessage: async (message: LiveServerMessage) => {
              // Input transcription (user STT)
              const inputText =
                (message as any)?.serverContent?.inputTranscription?.text ??
                (message as any)?.serverContent?.userTurn?.parts?.map((p: any) => p?.text).join('') ??
                '';

              if (typeof inputText === 'string' && inputText.trim()) {
                currentTranscriptionRef.current = (currentTranscriptionRef.current + ' ' + inputText).trim();
                setTranscription(currentTranscriptionRef.current);
              }

              // Output transcription (what model spoke)
              const outText = (message as any)?.serverContent?.outputTranscription?.text ?? '';
              if (typeof outText === 'string' && outText.trim()) {
                currentOutputTranscriptionRef.current = (currentOutputTranscriptionRef.current + ' ' + outText).trim();
                setOutputTranscription(currentOutputTranscriptionRef.current);
              }
            },

            onerror: (e) => {
              console.error('Gemini Live error:', e);
              setStatus('error');
              stopRecording();
            },

            onclose: () => {
              console.log('Gemini Live session closed callback');
              stopRecording();
            },
          },
        });

        sessionRef.current = sessionPromise;
      } catch (err) {
        console.error('Failed to start recording:', err);
        setStatus('error');
        stopRecording();
      }
    },
    [
      status,
      isRecording,
      stopRecording,
      options.mode,
      options.model,
      options.systemInstruction,
      options.targetLanguage,
    ],
  );

  const toggleRecording = useCallback(
    (customStream?: MediaStream) => {
      if (isRecording || status === 'connecting') {
        stopRecording();
      } else {
        startRecording(customStream);
      }
    },
    [isRecording, status, startRecording, stopRecording],
  );

  useEffect(() => {
    if (transcription === '') currentTranscriptionRef.current = '';
  }, [transcription]);

  useEffect(() => {
    if (outputTranscription === '') currentOutputTranscriptionRef.current = '';
  }, [outputTranscription]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopRecording();
  }, [stopRecording]);

  return {
    isRecording,
    transcription,
    outputTranscription,
    setTranscription,
    toggleRecording,
    status,
  };
}
