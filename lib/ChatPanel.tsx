'use client';

import React from 'react';
import { Chat, formatChatMessageLinks, useParticipants, useRoomContext } from '@livekit/components-react';
import styles from '../styles/Eburon.module.css';

export function ChatPanel() {
  const room = useRoomContext();
  const participants = useParticipants();
  const roomLabel = room?.name ? `Room ${room.name}` : 'Room';
  const participantCount = participants.length;
  const channelTopic = room?.name ? `room:${room.name}:chat` : undefined;

  return (
    <div className={styles.sidebarPanel}>
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarHeaderText}>
          <h3>Group chat</h3>
          <span className={styles.sidebarHeaderMeta}>
            {roomLabel} • {participantCount} in room
          </span>
        </div>
      </div>
      <div className={styles.chatWrapper}>
        <Chat messageFormatter={formatChatMessageLinks} channelTopic={channelTopic} />
      </div>
    </div>
  );
}
