'use client';

import { useEffect } from 'react';
import { generateRoomId } from '@/lib/client-utils';
import { useRouter } from 'next/navigation';
import styles from '@/styles/Home.module.css';

export default function RoomsIndex() {
  const router = useRouter();

  useEffect(() => {
    const roomId = generateRoomId();
    router.replace(`/rooms/${roomId}`);
  }, [router]);

  return (
    <div className={styles.loadingScreen}>
      Redirecting to new room...
    </div>
  );
}
