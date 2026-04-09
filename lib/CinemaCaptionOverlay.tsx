import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useGeminiLive } from './useGeminiLive';
import { useDeepgramTranscription } from './useDeepgramTranscription';
import { useRoomContext, useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './orbit/services/supabaseClient';

const overlayStyles = {
  captionBar: {
    position: 'fixed' as 'fixed',
    bottom: 80,
    left: '20px',
    right: '20px',
    width: 'auto',
    height: '50px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: '0 20px',
    zIndex: 999,
  },
  transcriptText: {
    fontSize: '14px',
    color: '#66ff00',
    fontWeight: 600,
    textAlign: 'left' as 'left',
    whiteSpace: 'nowrap' as 'nowrap',
    overflow: 'visible',
    width: '100%',
    textShadow: '0px 2px 4px rgba(0,0,0,0.9)',
    animation: 'slideIn 0.3s ease-out',
  },
};

interface CinemaCaptionOverlayProps {
    onTranscriptSegment: (segment: { text: string; language: string; isFinal: boolean }) => void;
    defaultDeviceId?: string;
    isFloorHolder?: boolean;
    onClaimFloor?: () => void;
    targetLanguage?: string;
}

export function CinemaCaptionOverlay({ 
    onTranscriptSegment, 
    defaultDeviceId,
    isFloorHolder = false,
    onClaimFloor,
    targetLanguage = 'English'
}: CinemaCaptionOverlayProps) {
    const [displayText, setDisplayText] = useState('');
    const [isFading, setIsFading] = useState(false);
    const captionRef = useRef<HTMLDivElement>(null);
    const room = useRoomContext();
    const { localParticipant } = useLocalParticipant();
    const lastMicStateRef = useRef<boolean | null>(null);
    
    // ====== GEMINI LIVE (for translation/TTS response) ======
    const {
        isRecording: isGeminiActive,
        toggleRecording: toggleGemini,
        transcription: geminiInputTranscription,
        outputTranscription: geminiOutputTranscription,
        status: geminiStatus,
    } = useGeminiLive({
        mode: 'translate_tts',
        targetLanguage,
    });

    // Display Gemini output transcription (translated speech)
    useEffect(() => {
        if (geminiOutputTranscription && isFloorHolder) {
            setDisplayText(geminiOutputTranscription);
            onTranscriptSegment({ text: geminiOutputTranscription, language: targetLanguage, isFinal: true });
        }
    }, [geminiOutputTranscription, isFloorHolder, onTranscriptSegment, targetLanguage]);

    // ====== DEEPGRAM (for STT) ======
    const handleDeepgramTranscript = useCallback((result: { transcript: string; isFinal: boolean; confidence: number }) => {
        if (!result.transcript) return;
        
        // Display user speech immediately
        setDisplayText(result.transcript);
        
        // Save to DB (if floor holder)
        if (isFloorHolder && result.isFinal) {
            onTranscriptSegment({ text: result.transcript, language: 'en', isFinal: true });
        }
    }, [isFloorHolder, onTranscriptSegment]);

    const {
        isListening: isDeepgramActive,
        startListening: startDeepgram,
        stopListening: stopDeepgram,
        interimTranscript
    } = useDeepgramTranscription({
        language: 'multi',
        model: 'nova-2',
        onTranscript: handleDeepgramTranscript
    });

    // Show interim transcript for real-time feedback
    useEffect(() => {
        if (interimTranscript && isFloorHolder) {
            setDisplayText(interimTranscript);
        }
    }, [interimTranscript, isFloorHolder]);

    // Subscribe to realtime transcriptions (FOR LISTENERS)
    useEffect(() => {
        if (!room?.name) return;

        const channel = supabase
            .channel(`transcriptions:${room.name}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'transcriptions',
                filter: `meeting_id=eq.${room.name}`
            }, (payload: RealtimePostgresChangesPayload<any>) => {
                if (payload.new) {
                    const newText = payload.new.transcribe_text_segment;
                    if (!isFloorHolder) {
                        setDisplayText(newText);
                        onTranscriptSegment({ text: newText, language: 'en', isFinal: true });
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [room?.name, isFloorHolder, onTranscriptSegment]);

    // Auto-start/stop based on mic state + FLOOR CONTROL
    useEffect(() => {
        if (!localParticipant) return;

        const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
        const isMicEnabled = !micPub?.isMuted && micPub?.track !== undefined;

        if (lastMicStateRef.current !== isMicEnabled) {
            lastMicStateRef.current = isMicEnabled;
            
            if (isMicEnabled && isFloorHolder) {
                // Start both Deepgram (STT) and Gemini (TTS)
                if (!isDeepgramActive) startDeepgram(defaultDeviceId);
                if (!isGeminiActive) toggleGemini();
            } else if (!isMicEnabled || !isFloorHolder) {
                // Stop both
                if (isDeepgramActive) stopDeepgram();
                if (isGeminiActive) toggleGemini();
            }
        }
    }, [localParticipant, isFloorHolder, isDeepgramActive, isGeminiActive, startDeepgram, stopDeepgram, toggleGemini, defaultDeviceId]);

    // Handle Floor Loss
    useEffect(() => {
        if (!isFloorHolder) {
            if (isDeepgramActive) stopDeepgram();
            if (isGeminiActive) toggleGemini();
        }
    }, [isFloorHolder, isDeepgramActive, isGeminiActive, stopDeepgram, toggleGemini]);

    // Auto-clear logic when text overflows
    useEffect(() => {
        if (captionRef.current && displayText) {
            const element = captionRef.current;
            const isOverflowing = element.scrollWidth > element.clientWidth;
            
            if (isOverflowing) {
                setIsFading(true);
                setTimeout(() => {
                    setDisplayText('');
                    setIsFading(false);
                }, 300);
            }
        }
    }, [displayText]);

    const isActive = isDeepgramActive || isGeminiActive;

    return (
        <div style={overlayStyles.captionBar}>
            <div 
                ref={captionRef}
                style={{
                    ...overlayStyles.transcriptText,
                    opacity: isFading ? 0 : 1,
                    transition: 'opacity 0.3s ease-out'
                }}
            >
                {displayText || (isActive && isFloorHolder && <span style={{color: '#66ff00', fontSize: '14px', fontWeight: 600}}>🎤 Listening...</span>)}
            </div>
        </div>
    );
}

