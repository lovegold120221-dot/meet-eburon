'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/orbit/services/supabaseClient';
import styles from '@/styles/PreJoin.module.css';

interface DeviceInfo {
  deviceId: string;
  label: string;
}

type PermissionState = 'prompt' | 'granted' | 'denied' | 'checking';

interface CustomPreJoinProps {
  roomName: string;
  onSubmit: (choices: {
    username: string;
    videoEnabled: boolean;
    audioEnabled: boolean;
    videoDeviceId: string;
    audioDeviceId: string;
    audioOutputDeviceId: string;
  }) => void;
  onError?: (error: Error) => void;
  defaults?: {
    username?: string;
    videoEnabled?: boolean;
    audioEnabled?: boolean;
    videoDeviceId?: string;
    audioDeviceId?: string;
    audioOutputDeviceId?: string;
  };
}

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const MicOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="2" x2="22" y1="2" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
  </svg>
);

const VideoOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z" />
    <line x1="2" x2="22" y1="2" y2="22" />
  </svg>
);



export function CustomPreJoin({ roomName, onSubmit, onError, defaults }: CustomPreJoinProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [username, setUsername] = useState(defaults?.username || '');
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Set initial values after mount to avoid hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    setVideoEnabled(defaults?.videoEnabled ?? true);
    setAudioEnabled(defaults?.audioEnabled ?? true);
  }, [defaults?.videoEnabled, defaults?.audioEnabled]);
  const [audioEnabled, setAudioEnabled] = useState(true);

  const [audioInputDevices, setAudioInputDevices] = useState<DeviceInfo[]>([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState<DeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);

  const [selectedAudioInput, setSelectedAudioInput] = useState(defaults?.audioDeviceId || '');
  const [selectedAudioOutput, setSelectedAudioOutput] = useState(defaults?.audioOutputDeviceId || '');
  const [selectedVideo, setSelectedVideo] = useState(defaults?.videoDeviceId || '');

  const [isLoading, setIsLoading] = useState(false);
  
  // Permission states
  const [cameraPermission, setCameraPermission] = useState<PermissionState>('checking');
  const [micPermission, setMicPermission] = useState<PermissionState>('checking');
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Room data from database
  const [roomData, setRoomData] = useState<{ id: string; room_code: string; name: string | null } | null>(null);



  // Check permissions on mount
  const checkPermissions = useCallback(async () => {
    try {
      // Check camera permission
      if (navigator.permissions) {
        try {
          const cameraResult = await navigator.permissions.query({ name: 'camera' as PermissionName });
          setCameraPermission(cameraResult.state as PermissionState);
          cameraResult.onchange = () => setCameraPermission(cameraResult.state as PermissionState);
        } catch {
          // Permission API not supported for camera
          setCameraPermission('prompt');
        }

        try {
          const micResult = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          setMicPermission(micResult.state as PermissionState);
          micResult.onchange = () => setMicPermission(micResult.state as PermissionState);
        } catch {
          // Permission API not supported for microphone
          setMicPermission('prompt');
        }
      } else {
        setCameraPermission('prompt');
        setMicPermission('prompt');
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      setCameraPermission('prompt');
      setMicPermission('prompt');
    }
  }, []);

  // Request permissions explicitly
  const requestPermissions = useCallback(async () => {
    setPermissionError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: true 
      });
      
      // Permissions granted - stop the test stream
      stream.getTracks().forEach(t => t.stop());
      
      setCameraPermission('granted');
      setMicPermission('granted');
      
      return true;
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Permission request failed:', error);
      
      if (error.name === 'NotAllowedError') {
        setPermissionError('Camera and microphone access was denied. Please allow access in your browser settings.');
        setCameraPermission('denied');
        setMicPermission('denied');
      } else if (error.name === 'NotFoundError') {
        setPermissionError('No camera or microphone found. Please connect a device and try again.');
      } else {
        setPermissionError(`Failed to access devices: ${error.message}`);
      }
      
      onError?.(error);
      return false;
    }
  }, [onError]);

  // Enumerate devices after permissions granted
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const audioInputs = devices
        .filter(d => d.kind === 'audioinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 4)}` }));
      
      const audioOutputs = devices
        .filter(d => d.kind === 'audiooutput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 4)}` }));
      
      const videoInputs = devices
        .filter(d => d.kind === 'videoinput')
        .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 4)}` }));

      setAudioInputDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);
      setVideoDevices(videoInputs);

      // Set defaults if not already set
      if (!selectedAudioInput && audioInputs.length > 0) {
        setSelectedAudioInput(audioInputs[0].deviceId);
      }
      if (!selectedAudioOutput && audioOutputs.length > 0) {
        setSelectedAudioOutput(audioOutputs[0].deviceId);
      }
      if (!selectedVideo && videoInputs.length > 0) {
        setSelectedVideo(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Error enumerating devices:', err);
    }
  }, [selectedAudioInput, selectedAudioOutput, selectedVideo]);

  // Start video preview with autoplay handling
  const startVideoPreview = useCallback(async () => {
    if (!videoEnabled || cameraPermission !== 'granted') {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideo ? { deviceId: { exact: selectedVideo } } : true,
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Handle autoplay with error catching
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Autoplay blocked, user interaction required:', playError);
        }
      }
    } catch (err) {
      console.error('Error starting video preview:', err);
    }
  }, [videoEnabled, selectedVideo, cameraPermission]);

  // Fetch or create room in database
  const fetchOrCreateRoom = useCallback(async () => {
    try {
      // Check if room exists
      const { data: existingRoom, error: fetchError } = await supabase
        .from('rooms')
        .select('id, room_code, name')
        .eq('room_code', roomName)
        .single();

      if (existingRoom) {
        setRoomData(existingRoom);
        return existingRoom;
      }

      // Room doesn't exist, create it
      if (fetchError && fetchError.code === 'PGRST116') {
        const { data: newRoom, error: createError } = await supabase
          .from('rooms')
          .insert({ room_code: roomName, name: roomName })
          .select('id, room_code, name')
          .single();

        if (createError) {
          console.error('Error creating room:', createError);
          return null;
        }

        setRoomData(newRoom);
        return newRoom;
      }

      return null;
    } catch (err) {
      console.error('Error fetching/creating room:', err);
      return null;
    }
  }, [roomName]);

  // Add participant to room
  const addParticipant = useCallback(async (userId: string, displayName: string, roomId: string) => {
    try {
      const { error } = await supabase
        .from('participants')
        .upsert({
          room_id: roomId,
          user_id: userId,
          display_name: displayName,
          preferred_language: 'en',
          joined_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
        }, {
          onConflict: 'room_id,user_id'
        });

      if (error) {
        console.error('Error adding participant:', error);
      }
    } catch (err) {
      console.error('Error adding participant:', err);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkPermissions();
    fetchOrCreateRoom();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [checkPermissions, fetchOrCreateRoom]);

  // Request permissions and enumerate devices
  useEffect(() => {
    const init = async () => {
      if (cameraPermission === 'granted' && micPermission === 'granted') {
        await enumerateDevices();
      } else if (cameraPermission === 'prompt' || micPermission === 'prompt') {
        const granted = await requestPermissions();
        if (granted) {
          await enumerateDevices();
        }
      }
    };
    
    if (cameraPermission !== 'checking' && micPermission !== 'checking') {
      init();
    }
  }, [cameraPermission, micPermission, enumerateDevices, requestPermissions]);

  // Start video preview when permissions granted
  useEffect(() => {
    if (cameraPermission === 'granted') {
      startVideoPreview();
    }
  }, [cameraPermission, startVideoPreview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    
    // Stop preview stream before joining
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Add participant to database if we have room data
    if (roomData) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await addParticipant(user.id, username.trim(), roomData.id);
      }
    }

    onSubmit({
      username: username.trim(),
      videoEnabled,
      audioEnabled,
      videoDeviceId: selectedVideo,
      audioDeviceId: selectedAudioInput,
      audioOutputDeviceId: selectedAudioOutput,
    });
  };

  const handleRetryPermissions = async () => {
    setPermissionError(null);
    const granted = await requestPermissions();
    if (granted) {
      await enumerateDevices();
    }
  };

  // Determine connection state for UI
  const isConnecting = false;

  return (
    <div className={styles.preJoinPage}>
      {/* (Legacy Sidebar removed - replaced by TranscriptionSidebar below) */}


      <form className={styles.preJoinContainer} onSubmit={handleSubmit}>
        <div className={styles.preJoinHeader}>
          <h1 className={styles.preJoinTitle}>
            ORBIT <span>CONFERENCE</span>
          </h1>
          <p className={styles.preJoinSubtitle}>Room: {roomName}</p>
        </div>

        {/* Permission Error */}
        {permissionError && (
          <div className={styles.permissionError}>
            <p>{permissionError}</p>
            <button 
              type="button" 
              onClick={handleRetryPermissions}
              className={styles.retryButton}
            >
              Retry Permissions
            </button>
          </div>
        )}

        {/* Video Preview */}
        <div className={styles.videoPreviewCard}>
          {videoEnabled && cameraPermission === 'granted' ? (
            <video
              ref={videoRef}
              className={styles.videoPreview}
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className={styles.videoPlaceholder}>
              {cameraPermission === 'denied' ? '🚫' : '📷'}
            </div>
          )}
          
          <div className={styles.videoControls}>
            <button
              type="button"
              className={`${styles.mediaButton} ${audioEnabled && micPermission === 'granted' ? styles.mediaButtonActive : styles.mediaButtonMuted}`}
              onClick={() => setAudioEnabled(!audioEnabled)}
              title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              disabled={micPermission === 'denied'}
            >
              {audioEnabled && micPermission !== 'denied' ? <MicIcon /> : <MicOffIcon />}
            </button>
            <button
              type="button"
              className={`${styles.mediaButton} ${videoEnabled && cameraPermission === 'granted' ? styles.mediaButtonActive : styles.mediaButtonMuted}`}
              onClick={() => setVideoEnabled(!videoEnabled)}
              title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              disabled={cameraPermission === 'denied'}
            >
              {videoEnabled && cameraPermission !== 'denied' ? <VideoIcon /> : <VideoOffIcon />}
            </button>
          </div>
        </div>

        {/* Device Selection */}
        <div className={styles.deviceSection}>
          <div className={styles.deviceGrid}>
            <div className={styles.deviceRow}>
              <label className={styles.deviceLabel}>🎤 Microphone</label>
              <select
                className={styles.deviceSelect}
                value={selectedAudioInput}
                onChange={(e) => setSelectedAudioInput(e.target.value)}
                title="Select microphone device"
                disabled={micPermission !== 'granted'}
              >
                {audioInputDevices.length === 0 && (
                  <option value="">No microphones found</option>
                )}
                {audioInputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.deviceRow}>
              <label className={styles.deviceLabel}>🔊 Speaker</label>
              <select
                className={styles.deviceSelect}
                value={selectedAudioOutput}
                onChange={(e) => setSelectedAudioOutput(e.target.value)}
                title="Select speaker device"
              >
                {audioOutputDevices.length === 0 && (
                  <option value="">No speakers found</option>
                )}
                {audioOutputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.deviceRow}>
            <label className={styles.deviceLabel}>📹 Camera</label>
            <select
              className={styles.deviceSelect}
              value={selectedVideo}
              onChange={(e) => setSelectedVideo(e.target.value)}
              title="Select camera device"
              disabled={cameraPermission !== 'granted'}
            >
              {videoDevices.length === 0 && (
                <option value="">No cameras found</option>
              )}
              {videoDevices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>
        </div>



        {/* Username Input */}
        <div className={styles.usernameSection}>
          <input
            type="text"
            className={styles.usernameInput}
            placeholder="Enter your name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        {/* Join Button */}
        <button
          type="submit"
          className={styles.joinButton}
          disabled={!mounted || isLoading || !username.trim()}
        >
          {isLoading ? 'Connecting...' : 'Join Room'}
        </button>

        <Link href="/" className={styles.backLink}>
          ← Back to Lobby
        </Link>
      </form>
    </div>
  );
}

export default CustomPreJoin;
