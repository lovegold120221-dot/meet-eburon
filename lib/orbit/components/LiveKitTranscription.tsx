'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RemoteParticipant, LocalParticipant, Track } from 'livekit-client';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { supabase } from '@/lib/orbit/services/supabaseClient';
import { useAuth } from '@/components/AuthProvider';
import sharedStyles from '@/styles/Eburon.module.css';

export type TranscriptionSegment = {
  text: string;
  speakerId: string;
  speakerName: string;
  timestamp: number;
  isFinal: boolean;
  roomId: string;
  userId?: string;
  isCurrentUser?: boolean;
  shouldSuppressTTS?: boolean;
};

interface LiveKitTranscriptionProps {
  room: Room;
  enabled: boolean;
  language: string;
  targetLanguage: string;
  onTranscriptSegment?: (segment: TranscriptionSegment) => void;
}

export function LiveKitTranscription({
  room,
  enabled,
  language,
  targetLanguage,
  onTranscriptSegment,
}: LiveKitTranscriptionProps) {
  const [transcriptions, setTranscriptions] = useState<TranscriptionSegment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [srcLang, setSrcLang] = useState('en-US');
  const [tgtLang, setTgtLang] = useState('sv');
  const [currentUserSpeaking, setCurrentUserSpeaking] = useState(false);
  const [lastSpeechTime, setLastSpeechTime] = useState(0);
  
  const dgConnectionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const { user } = useAuth();

  // Language options (simplified version from transcribe.html)
  const languageOptions = [
    { value: 'en-US', label: 'English (United States)', translate: 'en-US', speech: 'en-US' },
    { value: 'nl-BE', label: 'Dutch (Belgium / Flemish)', translate: 'nl-BE', speech: 'nl-BE' },
    { value: 'fr-FR', label: 'French (France)', translate: 'fr-FR', speech: 'fr-FR' },
    { value: 'es-ES', label: 'Spanish (Spain)', translate: 'es-ES', speech: 'es-ES' },
    { value: 'sv', label: 'Swedish', translate: 'sv', speech: 'sv-SE' },
  ];

  const getCurrentSpeaker = useCallback(() => {
    // Get the active speaker from LiveKit room
    const participants = [room.localParticipant, ...Array.from(room.remoteParticipants.values())];
    
    // Try to find the active speaker using LiveKit's active speaker detection
    // LiveKit provides information about who is currently speaking through audio levels
    let activeParticipant = room.localParticipant;
    let maxAudioLevel = 0;
    
    // Check local participant
    if (room.localParticipant.isMicrophoneEnabled) {
      const localAudioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
      if (localAudioTrack && localAudioTrack.isSubscribed) {
        // For now, assume local participant has some audio level if mic is enabled
        maxAudioLevel = 0.5;
        // Track that current user is speaking
        setCurrentUserSpeaking(true);
        setLastSpeechTime(Date.now());
      }
    }
    
    // Check remote participants for audio levels
    room.remoteParticipants.forEach((participant: any) => {
      const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
      if (audioTrack && audioTrack.isSubscribed) {
        // Simple heuristic: if remote participant has audio, consider them as potential speaker
        // In a more sophisticated implementation, you'd analyze actual audio levels
        const participantAudioLevel = 0.3; // Placeholder for actual audio level detection
        if (participantAudioLevel > maxAudioLevel) {
          maxAudioLevel = participantAudioLevel;
          activeParticipant = participant;
          // If remote participant is speaking more loudly, current user is not the primary speaker
          if (!participant.isLocal) {
            setCurrentUserSpeaking(false);
          }
        }
      }
    });
    
    // If no one seems to be speaking, default to local participant
    if (maxAudioLevel === 0) {
      activeParticipant = room.localParticipant;
      // Reset speaking state after a timeout
      setTimeout(() => {
        if (Date.now() - lastSpeechTime > 2000) { // 2 seconds of silence
          setCurrentUserSpeaking(false);
        }
      }, 2000);
    }
    
    return {
      speakerId: activeParticipant.identity,
      speakerName: activeParticipant.name || activeParticipant.identity,
      userId: user?.id,
      isLocal: activeParticipant.isLocal,
      isCurrentUser: activeParticipant.isLocal && activeParticipant.identity === user?.id,
    };
  }, [room, user, lastSpeechTime]);

  const createAudioStreamFromLiveKit = useCallback(async () => {
    try {
      // Get audio tracks from LiveKit
      const audioTracks: MediaStreamTrack[] = [];
      
      // Add local participant's audio if enabled
      if (room.localParticipant.isMicrophoneEnabled) {
        const localAudioTrack = room.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (localAudioTrack && localAudioTrack.track && localAudioTrack.track.mediaStreamTrack) {
          audioTracks.push(localAudioTrack.track.mediaStreamTrack);
        }
      }
      
      // Add remote participants' audio
      room.remoteParticipants.forEach((participant) => {
        const audioTrack = participant.getTrackPublication(Track.Source.Microphone);
        if (audioTrack && audioTrack.track && audioTrack.track.mediaStreamTrack) {
          audioTracks.push(audioTrack.track.mediaStreamTrack);
        }
      });

      if (audioTracks.length === 0) {
        console.warn('No audio tracks found in LiveKit room');
        return null;
      }

      // Create a combined audio stream
      const audioStream = new MediaStream(audioTracks);
      return audioStream;
    } catch (error) {
      console.error('Failed to create audio stream from LiveKit:', error);
      return null;
    }
  }, [room]);

  const startTranscription = useCallback(async () => {
    if (!enabled) return;
    
    // Check if microphone is enabled in LiveKit
    if (!room.localParticipant.isMicrophoneEnabled) {
      console.log('Microphone is not enabled, skipping transcription');
      setStatus('Microphone disabled');
      return;
    }

    try {
      setStatus('Connecting...');
      
      // Get Deepgram token
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
        setStatus('Listening...');
        setIsListening(true);
        
        // Create audio stream from LiveKit
        const audioStream = await createAudioStreamFromLiveKit();
        if (!audioStream) {
          setStatus('No audio found');
          return;
        }
        
        audioStreamRef.current = audioStream;
        
        const recorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && connection.getReadyState() === 1) {
            connection.send(event.data);
          }
        };

        recorder.start(250);
      });

      connection.on(LiveTranscriptionEvents.Transcript, async (data) => {
        const transcript = data.channel.alternatives[0]?.transcript;
        if (transcript) {
          const speaker = getCurrentSpeaker();
          const segment: TranscriptionSegment = {
            text: transcript,
            speakerId: speaker.speakerId,
            speakerName: speaker.speakerName,
            timestamp: Date.now(),
            isFinal: data.is_final,
            roomId: room.name || 'unknown',
            userId: speaker.userId,
            isCurrentUser: speaker.isCurrentUser,
          };

          if (data.is_final) {
            // Add to transcriptions list
            setTranscriptions(prev => [...prev, segment]);
            
            // Call callback with TTS suppression info
            onTranscriptSegment?.({
              ...segment,
              shouldSuppressTTS: speaker.isCurrentUser && currentUserSpeaking
            });
            
            // Save to Firebase
            try {
              const meetingId = typeof window !== 'undefined' ? sessionStorage.getItem('eburon_meeting_id') : null;
              const roomId = room.name || meetingId || 'unknown';
              await supabase.from('transcriptions').insert({
                meeting_id: meetingId || roomId,
                speaker_id: speaker.speakerId,
                user_id: speaker.userId || null,
                transcribe_text_segment: transcript,
                full_transcription: transcript,
                is_current_user: speaker.isCurrentUser,
                suppress_tts: speaker.isCurrentUser && currentUserSpeaking,
              });
            } catch (error) {
              console.error('Failed to save transcription to Firebase:', error);
            }
          }
        }
      });

      connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Deepgram connection closed');
        setStatus('Idle');
        setIsListening(false);
      });

      connection.on(LiveTranscriptionEvents.Error, (err) => {
        console.error('Deepgram error:', err);
        setStatus('Error');
        setIsListening(false);
      });

    } catch (error) {
      console.error('Failed to start transcription:', error);
      setStatus('Failed to start');
      setIsListening(false);
    }
  }, [enabled, language, room, getCurrentSpeaker, onTranscriptSegment, createAudioStreamFromLiveKit]);

  const stopTranscription = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch (_) { }
    }
    mediaRecorderRef.current = null;

    if (dgConnectionRef.current) {
      try { dgConnectionRef.current.finish(); } catch (_) { }
    }
    dgConnectionRef.current = null;

    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
    }
    audioStreamRef.current = null;

    setIsListening(false);
    setStatus('Idle');
  }, []);

  // Start transcription when enabled and microphone is on
  React.useEffect(() => {
    if (enabled && room && room.localParticipant.isMicrophoneEnabled) {
      console.log('Starting transcription - microphone enabled');
      startTranscription();
    } else {
      console.log('Stopping transcription - microphone disabled or transcription disabled');
      stopTranscription();
    }
  }, [enabled, room, startTranscription, stopTranscription]);

  // Also listen for microphone changes
  React.useEffect(() => {
    if (!room) return;

    const handleMicrophoneChange = () => {
      if (enabled && room.localParticipant.isMicrophoneEnabled) {
        console.log('Microphone turned on - starting transcription');
        startTranscription();
      } else {
        console.log('Microphone turned off - stopping transcription');
        stopTranscription();
      }
    };

    // Listen for microphone state changes
    room.localParticipant.on('trackMuted', handleMicrophoneChange);
    room.localParticipant.on('trackUnmuted', handleMicrophoneChange);

    return () => {
      room.localParticipant.off('trackMuted', handleMicrophoneChange);
      room.localParticipant.off('trackUnmuted', handleMicrophoneChange);
    };
  }, [room, enabled, startTranscription, stopTranscription]);

  // Handle room connection/disconnection
  React.useEffect(() => {
    if (!room || room.state !== 'connected') {
      stopTranscription();
    }
  }, [room?.state, stopTranscription]);

  const handleToggleListening = () => {
    if (isListening) {
      stopTranscription();
    } else {
      startTranscription();
    }
  };

  return (
    <div className={sharedStyles.sidebarPanel} style={{ padding: 0, overflow: 'hidden', height: '100%', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '24px 20px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', background: '#161616', color: '#f0f0f0', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold', letterSpacing: '0.05em', color: '#ffffff', paddingBottom: '16px', borderBottom: '1px solid #222222' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="24" height="24" viewBox="0 0 48 48" fill="none" style={{ color: '#dca83a' }}>
              <circle cx="20" cy="24" r="10" stroke="currentColor" strokeWidth="2" />
              <path d="M6 28c7-6 21-9 36-5" stroke="currentColor" strokeWidth="2" opacity="0.7" />
              <circle cx="36" cy="14" r="3" fill="currentColor" opacity="0.7" />
            </svg>
            Orbit Translator
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Room ID</label>
              <input 
                type="text" 
                value={room.name || 'Unknown'} 
                readOnly 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#111111', 
                  border: '1px solid #333333', 
                  borderRadius: '12px', 
                  color: '#f0f0f0', 
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', 
                  fontSize: '13px',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }} 
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>User ID</label>
              <input 
                type="text" 
                value={user?.id || 'Anonymous'} 
                readOnly 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#111111', 
                  border: '1px solid #333333', 
                  borderRadius: '12px', 
                  color: '#f0f0f0', 
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', 
                  fontSize: '13px',
                  cursor: 'not-allowed',
                  opacity: 0.6
                }} 
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Source Language</label>
              <select 
                value={srcLang}
                onChange={(e) => setSrcLang(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#111111', 
                  border: '1px solid #333333', 
                  borderRadius: '12px', 
                  color: '#f0f0f0', 
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', 
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '6px' }}>Target Language</label>
              <select 
                value={tgtLang}
                onChange={(e) => setTgtLang(e.target.value)}
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  background: '#111111', 
                  border: '1px solid #333333', 
                  borderRadius: '12px', 
                  color: '#f0f0f0', 
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', 
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                {languageOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleToggleListening}
            disabled={!enabled}
            style={{
              width: '100%',
              padding: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: isListening ? 'transparent' : '#dca83a',
              border: '1px solid #dca83a',
              borderRadius: '12px',
              color: isListening ? '#dca83a' : '#111111',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: enabled ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              marginTop: '4px',
              opacity: enabled ? 1 : 0.5
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M4 5h7m-7 4h5m7-4h4m-4 0v14m0-14l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M5 19h6m-6 0v-4m0 4l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
          </button>
        </div>

        {/* Visualizer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '18px', padding: '0 4px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%' }}>
            <label style={{ fontSize: '9px', color: '#888888', marginRight: '8px', marginBottom: '2px' }}>MIC</label>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: isListening ? `${4 + Math.random() * 14}px` : '4px',
                  borderRadius: '2px',
                  background: isListening ? '#dca83a' : '#333333',
                  boxShadow: isListening ? '0 0 8px rgba(220, 168, 58, 0.4)' : 'none',
                  transition: 'height 0.08s ease-out'
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%' }}>
            <label style={{ fontSize: '9px', color: '#888888', marginRight: '8px', marginBottom: '2px' }}>TTS</label>
            {[1, 2, 3, 4].map(i => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: '4px',
                  borderRadius: '2px',
                  background: '#333333',
                }}
              />
            ))}
          </div>
        </div>

        {/* Transcription Display */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'hidden' }}>
          <div style={{ flex: 1, background: '#111111', border: '1px solid #333333', borderRadius: '12px', padding: '16px', overflow: 'hidden' }}>
            <div style={{ fontSize: '10px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px', borderBottom: '1px solid #222222', paddingBottom: '8px' }}>
              Live Transcription
            </div>
            <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.6', wordBreak: 'break-word', flex: 1, overflowY: 'auto', paddingRight: '6px', whiteSpace: 'pre-wrap' }}>
              {transcriptions.length === 0 ? (
                <span style={{ color: '#888888' }}>
                  {enabled ? 'Tap "Start Listening" to begin...' : 'Transcription is disabled'}
                </span>
              ) : (
                transcriptions.map((segment, index) => (
                  <div key={index} style={{ marginBottom: '8px' }}>
                    <span style={{ color: '#dca83a', fontWeight: 'bold' }}>
                      [{segment.speakerName}]:
                    </span>{' '}
                    {segment.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #222222', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: '#888888' }}>
            <div
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: isListening ? '#dca83a' : 'rgba(220, 168, 58, 0.2)',
                boxShadow: isListening ? '0 0 8px rgba(220, 168, 58, 0.6)' : 'none'
              }}
            />
            <span>{status}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
