import { useState, useRef, useCallback, useEffect } from 'react';

const ASSEMBLYAI_API_KEY = process.env.NEXT_PUBLIC_ASSEMBLYAI_API_KEY || '1b078ed677b849209c7ce96590091f2a';

export function useAssemblyAI() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    // 1. Close WebSocket
    if (socketRef.current) {
      if (socketRef.current.readyState === WebSocket.OPEN) {
        // Try to send Terminate if still open
        try {
            socketRef.current.send(JSON.stringify({ type: 'Terminate' }));
        } catch (e) { /* ignore */ }
        socketRef.current.close();
      }
      socketRef.current = null;
    }

    // 2. Stop Audio Processing
    if (processorRef.current && sourceRef.current) {
        processorRef.current.disconnect();
        sourceRef.current.disconnect();
        processorRef.current = null;
        sourceRef.current = null;
    }

    if (audioContextRef.current) {
        audioContextRef.current.close().catch(console.error);
        audioContextRef.current = null;
    }

    // 3. Stop Tracks
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
    }

    setIsListening(false);
  }, []);

  const startListening = useCallback(async () => {
    if (isListening) return;
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    try {
        // 1. Get Microphone
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // 2. Setup AudioContext (16kHz required by AssemblyAI default params)
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContextClass({ sampleRate: 16000 });
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        sourceRef.current = source;

        // ScriptProcessor (Deprecated but easiest for raw PCM without AudioWorklet file setup)
        // Buffer size 4096 is good balance.
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        source.connect(processor);
        processor.connect(audioContext.destination);

        // 3. Connect WebSocket
        // Note: passing token in query params because browser WebSocket doesn't support headers
        const url = `wss://streaming.assemblyai.com/v3/ws?sample_rate=16000&token=${ASSEMBLYAI_API_KEY}`;
        
        const socket = new WebSocket(url);
        socketRef.current = socket;

        socket.onopen = () => {
             console.log('AssemblyAI WebSocket connected');
             setIsListening(true);
        };

        socket.onmessage = (event) => {
             try {
                const data = JSON.parse(event.data);
                
                if (data.type === 'Turn') {
                    // "transcript" field contains text
                    // If turn_is_formatted is true, it's a "final" semantic turn.
                    if (data.transcript) {
                        // For basic implementation: we append fully formatted turns to 'transcript'
                        // and put partial unformatted stuff in 'interim'.
                        // However, AssemblyAI real-time sends cumulative phrases sometimes? 
                        // The reference script clears line and prints.
                        // We will replicate common behavior:
                        // If it's partial, show as interim. If it's formatted (final), append to transcript.
                        
                        // AssemblyAI v2 behavior:
                        // data.message_type === 'PartiaTranscript' vs 'FinalTranscript'
                        // AssemblyAI v3 behavior:
                        // type='Turn'. format_turns=true causes it to collect.
                        
                        // Let's assume every message with text is relevant.
                        // We might get duplicates if we aren't careful.
                        // For simplicity:
                        // If 'turn_is_formatted' is true -> It's a "Final" segment of a turn. Append it.
                        // If 'turn_is_formatted' (or missing) -> It might be partial.
                        
                        // Actually, looking at docs: "interim_results" is a feature.
                        // For now, let's just create a rolling log.
                        if (data.transcript) {
                             if (data.audio_start !== undefined) {
                                // It has timing, likely partial or final. 
                                // We will just overwrite 'interim' with the latest message content
                                // UNLESS it seems final?
                                // Let's just append everything for now to be safe and visible.
                                // Improvement: Detect 'Final' flag if available.
                                setInterimTranscript(data.transcript); 
                             }
                        }
                    }
                }
                
                // Handling "SessionBegins" etc.
                if (data.message_type === 'FinalTranscript') {
                     // Legacy v2 check just in case
                     setTranscript(prev => prev + ' ' + data.text);
                     setInterimTranscript('');
                }
             } catch (e) {
                 console.error("Error parsing message", e);
             }
        };

        socket.onerror = (ev) => {
             console.error("AssemblyAI Socket Error", ev);
             setError("Connection error");
             cleanup();
        };
        
        socket.onclose = (ev) => {
             console.log("AssemblyAI Socket Closed", ev.code, ev.reason);
             setIsListening(false);
             cleanup();
        };

        // 4. Send Audio Data
        processor.onaudioprocess = (e) => {
             if (socket.readyState !== WebSocket.OPEN) return;

             const inputData = e.inputBuffer.getChannelData(0); // Float32Array
             // Convert to Int16
             const pcmData = new Int16Array(inputData.length);
             for (let i = 0; i < inputData.length; i++) {
                 // Clone standard conversion logic
                 const s = Math.max(-1, Math.min(1, inputData[i]));
                 pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
             }
             
             // Send binary
             socket.send(pcmData.buffer);
        };

    } catch (err: any) {
        console.error("Failed to start AssemblyAI", err);
        setError(err.message || "Failed to start");
        setIsListening(false);
    }
  }, [isListening, cleanup]);

  const stopListening = useCallback(() => {
     cleanup();
  }, [cleanup]);

  useEffect(() => {
      // Cleanup on unmount
      return () => {
          cleanup();
      }
  }, [cleanup]);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    error
  };
}
