




import React from 'react';
import {
  MediaDeviceMenu,
  TrackReference,
  TrackToggle,
  useLocalParticipant,
  VideoTrack,
} from '@livekit/components-react';
import { BackgroundBlur, VirtualBackground } from '@livekit/track-processors';
import { isLocalTrack, LocalTrackPublication, Track } from 'livekit-client';
import roomStyles from '@/styles/Eburon.module.css';

type BackgroundImage = {
  name: string;
  src: string;
  className: string;
};

// Background image paths
const BACKGROUND_IMAGES: BackgroundImage[] = [
  {
    name: 'Desk',
    src: '/background-images/samantha-gades-BlIhVfXbi9s-unsplash.jpg',
    className: 'imageButtonDesk',
  },
  {
    name: 'Nature',
    src: '/background-images/ali-kazal-tbw_KQE3Cbg-unsplash.jpg',
    className: 'imageButtonNature',
  },
];

// Background options
type BackgroundType = 'none' | 'blur' | 'image';

export function CameraSettings() {
  const { cameraTrack, localParticipant } = useLocalParticipant();
  const [backgroundType, setBackgroundType] = React.useState<BackgroundType>(
    (cameraTrack as LocalTrackPublication)?.track?.getProcessor()?.name === 'background-blur'
      ? 'blur'
      : (cameraTrack as LocalTrackPublication)?.track?.getProcessor()?.name === 'virtual-background'
        ? 'image'
        : 'none',
  );

  const [virtualBackgroundImagePath, setVirtualBackgroundImagePath] = React.useState<string | null>(
    null,
  );

  const camTrackRef: TrackReference | undefined = React.useMemo(() => {
    return cameraTrack
      ? { participant: localParticipant, publication: cameraTrack, source: Track.Source.Camera }
      : undefined;
  }, [localParticipant, cameraTrack]);

  const selectBackground = (type: BackgroundType, imagePath?: string) => {
    setBackgroundType(type);
    if (type === 'image' && imagePath) {
      setVirtualBackgroundImagePath(imagePath);
    } else if (type !== 'image') {
      setVirtualBackgroundImagePath(null);
    }
  };

  React.useEffect(() => {
    if (isLocalTrack(cameraTrack?.track)) {
      if (backgroundType === 'blur') {
        cameraTrack.track?.setProcessor(BackgroundBlur());
      } else if (backgroundType === 'image' && virtualBackgroundImagePath) {
        cameraTrack.track?.setProcessor(VirtualBackground(virtualBackgroundImagePath));
      } else {
        cameraTrack.track?.stopProcessor();
      }
    }
  }, [cameraTrack, backgroundType, virtualBackgroundImagePath]);

  return (
    <div className={roomStyles.settingsContainer}>
      {camTrackRef && (
        <VideoTrack
          className={roomStyles.videoPreview}
          trackRef={camTrackRef}
        />
      )}

      <section className="lk-button-group">
        <TrackToggle source={Track.Source.Camera}>Camera</TrackToggle>
        <div className="lk-button-group-menu">
          <MediaDeviceMenu kind="videoinput" />
        </div>
      </section>

      <div className={roomStyles.effectsSection}>
        <div className={roomStyles.effectsTitle}>Background Effects</div>
        <div className={roomStyles.effectsList}>
          {backgroundType === 'none' ? (
            <button
              onClick={() => selectBackground('none')}
              className={`lk-button ${roomStyles.effectButton} ${roomStyles.effectButtonActive}`}
              aria-pressed="true"
            >
              None
            </button>
          ) : (
            <button
              onClick={() => selectBackground('none')}
              className={`lk-button ${roomStyles.effectButton}`}
              aria-pressed="false"
            >
              None
            </button>
          )}

          {backgroundType === 'blur' ? (
            <button
              onClick={() => selectBackground('blur')}
              className={`lk-button ${roomStyles.blurButton} ${roomStyles.effectButtonActive}`}
              aria-pressed="true"
            >
              <div className={roomStyles.blurOverlay} />
              <span className={roomStyles.effectLabel}>Blur</span>
            </button>
          ) : (
            <button
              onClick={() => selectBackground('blur')}
              className={`lk-button ${roomStyles.blurButton}`}
              aria-pressed="false"
            >
              <div className={roomStyles.blurOverlay} />
              <span className={roomStyles.effectLabel}>Blur</span>
            </button>
          )}

          {BACKGROUND_IMAGES.map((image) => {
            const isSelected =
              backgroundType === 'image' && virtualBackgroundImagePath === image.src;
            const imageClassName =
              roomStyles[image.className as keyof typeof roomStyles] ?? '';
            return isSelected ? (
              <button
                key={image.src}
                onClick={() => selectBackground('image', image.src)}
                className={`lk-button ${roomStyles.imageButton} ${imageClassName} ${roomStyles.effectButtonActive}`}
                aria-pressed="true"
              >
                <span className={roomStyles.effectLabel}>{image.name}</span>
              </button>
            ) : (
              <button
                key={image.src}
                onClick={() => selectBackground('image', image.src)}
                className={`lk-button ${roomStyles.imageButton} ${imageClassName} ${roomStyles.effectButton}`}
                aria-pressed="false"
              >
                <span className={roomStyles.effectLabel}>{image.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
// verified clean Sun Jan  4 04:33:31 PST 2026
