'use client';

import React from 'react';
import {
  useParticipants,
  useLocalParticipant,
  RoomContext,
  useTracks,
  useLayoutContext,
  usePinnedTracks,
  isTrackReference,
  ParticipantTile,
  type TrackReferenceOrPlaceholder,
  type TrackReference,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import styles from '../styles/Eburon.module.css';

// Icons
const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
  </svg>
);

const MicOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M18.89 13.23A7.12 7.12 0 0 0 19 12v-2" />
    <path d="M5 10v2a7 7 0 0 0 12 5" />
    <path d="M15 9.34V5a3 3 0 0 0-5.68-1.33" />
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="m22 8-6 4 6 4V8Z" />
    <rect x="2" y="6" width="14" height="12" rx="2" ry="2" />
  </svg>
);

const CameraOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M10.66 6H14a2 2 0 0 1 2 2v2.34l1 1L22 8v8" />
    <path d="M16 16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h2l10 10Z" />
  </svg>
);

const VolumeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const VolumeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <line x1="22" y1="9" x2="16" y2="15" />
    <line x1="16" y1="9" x2="22" y2="15" />
  </svg>
);

const UserRemoveIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="17" y1="8" x2="23" y2="14" />
    <line x1="23" y1="8" x2="17" y2="14" />
  </svg>
);

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M12 17v5" />
    <path d="M5 9l7-7 7 7" />
    <path d="M5 9h14" />
    <path d="M7 9v6l-2 2v1h14v-1l-2-2V9" />
  </svg>
);

const PinOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <line x1="2" y1="2" x2="22" y2="22" />
    <path d="M12 17v5" />
    <path d="M5 9h5" />
    <path d="M14 9h5" />
    <path d="M7 9v4" />
    <path d="M17 9v6l-2 2v1h4" />
    <path d="M9 5l3-3 7 7" />
  </svg>
);

const HandRaisedIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
    <path d="M6 11V6a1.5 1.5 0 0 1 3 0v5" />
    <path d="M9 11V4a1.5 1.5 0 0 1 3 0v7" />
    <path d="M12 11V5a1.5 1.5 0 0 1 3 0v6" />
    <path d="M15 11V7a1.5 1.5 0 0 1 3 0v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-2a2 2 0 0 1 2-2h2" />
  </svg>
);

const ChatIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
  </svg>
);

// ... imports
import { useMeetingFloor } from '@/lib/useMeetingFloor';

// ... (icons)

export function ParticipantsPanel({
  alias = 'Trainor',
  onDirectMessage,
  waitingRoomEnabled,
  onWaitingRoomToggle,
  waitingList,
  onAdmitParticipant,
  admittedIds,
}: {
  alias?: string;
  onDirectMessage?: (participantIdentity: string, participantName: string) => void;
  waitingRoomEnabled: boolean;
  onWaitingRoomToggle: (enabled: boolean) => void;
  waitingList: { identity: string; name: string }[];
  onAdmitParticipant: (identity: string) => void;
  admittedIds: Set<string>;
}) {
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();
  const room = React.useContext(RoomContext);
  const layoutContext = useLayoutContext();
  const [showVideoList, setShowVideoList] = React.useState(false);
  
  // Floor Control Hook
  const { isFloorHolder, grantFloor, activeSpeakerId: floorSpeakerId } = useMeetingFloor(room?.name || '', localParticipant?.identity || '');

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  );
  const cameraTracks = useTracks(
    [{ source: Track.Source.Camera, withPlaceholder: true }],
    { onlySubscribed: false },
  ) as TrackReferenceOrPlaceholder[];
  const pinnedTrack = usePinnedTracks(layoutContext)?.[0];
  
  // Track muted audio for remote participants (local mute)
  const [mutedParticipants, setMutedParticipants] = React.useState<Set<string>>(new Set());
  const [isBulkAction, setIsBulkAction] = React.useState(false);

  const trackReferences = React.useMemo(
    () => tracks.filter(isTrackReference) as TrackReference[],
    [tracks],
  );

  const toggleParticipantMute = (participantId: string) => {
    setMutedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };

  const handleMuteAll = async () => {
    if (!room?.name) return;
    setIsBulkAction(true);
    try {
      await fetch('/api/room/mute-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: room.name,
          trackSource: Track.Source.Microphone,
          muted: true,
          excludeIdentity: localParticipant?.identity,
        }),
      });
    } catch (error) {
      console.error('Failed to mute all participants:', error);
    } finally {
      setIsBulkAction(false);
    }
  };

  const handleRemoveParticipant = async (participantIdentity: string) => {
    if (!room?.name) return;
    try {
      await fetch('/api/room/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomName: room.name,
          participantIdentity,
        }),
      });
    } catch (error) {
      console.error('Failed to remove participant:', error);
    }
  };

  // Apply mute to audio tracks
  React.useEffect(() => {
    participants.forEach(participant => {
      if (participant.identity !== localParticipant?.identity) {
        const audioTracks = participant.getTrackPublications();
        audioTracks.forEach(pub => {
          if (pub.source === Track.Source.Microphone && pub.track) {
            const isMuted = mutedParticipants.has(participant.identity);
            // Mute/unmute the audio element if available
            const audioElements = document.querySelectorAll(`audio[data-lk-source="${Track.Source.Microphone}"]`);
            audioElements.forEach(el => {
              if (el instanceof HTMLAudioElement) {
                el.muted = isMuted;
              }
            });
          }
        });
      }
    });
  }, [mutedParticipants, participants, localParticipant]);

  return (
    <div className={styles.sidebarPanel}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarHeaderText}>
          <h3>{alias}</h3>
          <span className={styles.sidebarHeaderMeta}>{participants.length} online</span>
        </div>
        <div className={styles.sidebarHeaderActions}>
          <button
            className={`${styles.sidebarHeaderButton} ${waitingRoomEnabled ? styles.sidebarHeaderButtonActive : ''}`}
            type="button"
            onClick={() => onWaitingRoomToggle(!waitingRoomEnabled)}
            aria-pressed={waitingRoomEnabled}
            title={waitingRoomEnabled ? 'Disable waiting room' : 'Enable waiting room'}
          >
            Waiting room
          </button>
          <button
            className={`${styles.sidebarHeaderButton} ${showVideoList ? styles.sidebarHeaderButtonActive : ''}`}
            type="button"
            onClick={() => setShowVideoList((prev) => !prev)}
            title={showVideoList ? 'Show participant list' : 'Show video list'}
            aria-pressed={showVideoList}
          >
            Video list
          </button>
          <button
            className={styles.sidebarHeaderButton}
            type="button"
            onClick={handleMuteAll}
            disabled={isBulkAction}
            title="Mute all microphones"
          >
            Mute all
          </button>
        </div>
      </div>
      {showVideoList ? (
        <div className={styles.participantVideoList}>
          {cameraTracks.map((trackRef) => {
            const identity = trackRef.participant?.identity ?? trackRef.participant?.sid ?? 'unknown';
            if (trackRef.participant && !admittedIds.has(trackRef.participant.identity) && !trackRef.participant.isLocal) {
              return null;
            }
            return (
              <ParticipantTile
                key={identity}
                trackRef={trackRef}
                className={styles.participantVideoItem}
              />
            );
          })}
        </div>
      ) : (
        <div className={styles.participantsList}>
          {waitingList.length > 0 && (
            <div className={styles.sidebarCard}>
              <div className={styles.sidebarCardText}>
                <span className={styles.sidebarCardLabel}>Waiting room</span>
                <span className={styles.sidebarCardHint}>{waitingList.length} pending</span>
              </div>
              <div className={styles.waitingList}>
                {waitingList.map((w) => (
                  <div key={w.identity} className={styles.waitingItem}>
                    <span className={styles.waitingName}>{w.name}</span>
                    <button
                      className={styles.sidebarCardButton}
                      type="button"
                      onClick={() => onAdmitParticipant(w.identity)}
                    >
                      Admit
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {participants.map((participant) => {
            const isLocal = participant.identity === localParticipant?.identity;
            const isAdmitted = participant.isLocal || admittedIds.has(participant.identity);
            const isMicEnabled = participant.isMicrophoneEnabled;
            const isCameraEnabled = participant.isCameraEnabled;
            const isAudioMuted = mutedParticipants.has(participant.identity);
            const isHandRaised = participant.attributes?.handRaised === 'true';
            const fullName = (participant.name || participant.identity || 'Guest').trim() || 'Guest';
            const shortName = fullName.slice(0, 7);
            const cameraTrack = trackReferences.find(
              (track) =>
                track.participant.identity === participant.identity &&
                track.source === Track.Source.Camera,
            );
            const screenTrack = trackReferences.find(
              (track) =>
                track.participant.identity === participant.identity &&
                track.source === Track.Source.ScreenShare,
            );
            const pinTarget = screenTrack ?? cameraTrack;
            const pinnedTrackSid = isTrackReference(pinnedTrack)
              ? pinnedTrack.publication?.trackSid
              : undefined;
            const isPinned = pinTarget?.publication?.trackSid === pinnedTrackSid;
            
            // Determine if this user holds the floor
            const participantHoldsFloor = floorSpeakerId === participant.identity;

            const handleRemoteMute = async (trackSource: Track.Source, muted: boolean) => {
              if (isLocal) return; // Don't mute self via API (let local controls handle it)
              try {
                const trackPublication = participant.getTrackPublication(trackSource);
                const trackSid = trackPublication?.trackSid;
                
                await fetch('/api/room/mute', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    roomName: room?.name,
                    participantIdentity: participant.identity,
                    trackSid: trackSid,
                    trackSource: trackSource,
                    muted: muted,
                  }),
                });
              } catch (error) {
                console.error('Failed to toggle mute:', error);
              }
            };

            return (
              <div key={participant.identity} className={styles.participantItem}>
                <div className={styles.participantAvatar}>
                  {(participant.name || participant.identity).charAt(0).toUpperCase()}
                </div>
                <div className={styles.participantInfo}>
                  <div className={styles.participantNameRow}>
                    <span className={styles.participantName} title={fullName}>
                      {shortName}
                      {isLocal && <span className={styles.youBadge}> (You)</span>}
                    </span>
                    {participantHoldsFloor && (
                        <span style={{ fontSize: '10px', background: '#66ff00', color: 'black', padding: '2px 4px', borderRadius: '4px', marginLeft: '6px', fontWeight: 'bold' }}>
                           ON AIR
                        </span>
                    )}
                    {isHandRaised && (
                      <span className={styles.handRaisedBadge} title="Hand raised">
                        <HandRaisedIcon />
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.participantControls}>
                  {!isAdmitted && !isLocal && waitingRoomEnabled && (
                    <button
                      className={styles.participantControl}
                      onClick={() => onAdmitParticipant(participant.identity)}
                      title="Admit from waiting room"
                    >
                      <HandRaisedIcon />
                    </button>
                  )}

                  {pinTarget && (
                    <button
                      className={`${styles.participantControl} ${isPinned ? styles.controlButtonActive : ''}`}
                      onClick={() => {
                        if (!layoutContext?.pin?.dispatch) {
                          return;
                        }
                        if (isPinned) {
                          layoutContext.pin.dispatch({ msg: 'clear_pin' });
                        } else {
                          layoutContext.pin.dispatch({ msg: 'set_pin', trackReference: pinTarget });
                        }
                      }}
                      title={isPinned ? 'Unpin from stage' : 'Pin to stage'}
                    >
                      {isPinned ? <PinOffIcon /> : <PinIcon />}
                    </button>
                  )}

                  {/* Mute/Unmute audio (for remote participants) - LOCAL VOLUME */}
                  {!isLocal && (
                    <button
                      className={`${styles.participantControl} ${isAudioMuted ? styles.controlMuted : ''}`}
                      onClick={() => toggleParticipantMute(participant.identity)}
                      title={isAudioMuted ? 'Unmute audio locally' : 'Mute audio locally'}
                    >
                      {isAudioMuted ? <VolumeOffIcon /> : <VolumeIcon />}
                    </button>
                  )}
                  
                  {/* Grant Floor Button (Only visible if YOU hold the floor, and target is NOT you) */}
                  {isFloorHolder && !isLocal && (
                      <button
                        className={styles.participantControl}
                        onClick={() => grantFloor(participant.identity)}
                        title="Grant Microphone Floor"
                        style={{ color: '#66ff00' }}
                      >
                         <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                            <path d="M12 19a7 7 0 0 1-7-7" />
                            <path d="M19 12a7 7 0 0 1-7 7" />
                         </svg>
                      </button>
                  )}

                  {/* Host Controls: Remote Mic Toggle */}
                  <button
                    className={`${styles.participantControl} ${isMicEnabled ? styles.statusOn : styles.statusOff} ${isLocal ? styles.cursorDefault : styles.cursorPointer}`}
                    disabled={isLocal} // Optional: allow muting self via API? Better to use standard controls.
                    onClick={() => !isLocal && handleRemoteMute(Track.Source.Microphone, isMicEnabled)}
                    title={isLocal ? 'Your Microphone' : (isMicEnabled ? 'Mute Participant' : 'Unmute Participant')}
                  >
                    {isMicEnabled ? <MicIcon /> : <MicOffIcon />}
                  </button>

                  {/* Host Controls: Remote Camera Toggle */}
                  <button
                    className={`${styles.participantControl} ${isCameraEnabled ? styles.statusOn : styles.statusOff} ${isLocal ? styles.cursorDefault : styles.cursorPointer}`}
                    disabled={isLocal}
                    onClick={() => !isLocal && handleRemoteMute(Track.Source.Camera, isCameraEnabled)}
                    title={isLocal ? 'Your Camera' : (isCameraEnabled ? 'Disable Camera' : 'Enable Camera')}
                  >
                    {isCameraEnabled ? <CameraIcon /> : <CameraOffIcon />}
                  </button>

                  {!isLocal && (
                    <button
                      className={`${styles.participantControl} ${styles.participantRemove}`}
                      onClick={() => handleRemoveParticipant(participant.identity)}
                      title="Remove participant"
                    >
                      <UserRemoveIcon />
                    </button>
                  )}

                  {/* Direct Message */}
                  {!isLocal && onDirectMessage && (
                    <button
                      className={`${styles.participantControl} ${styles.participantChat}`}
                      onClick={() => onDirectMessage(participant.identity, fullName)}
                      title={`Message ${fullName}`}
                    >
                      <ChatIcon />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
