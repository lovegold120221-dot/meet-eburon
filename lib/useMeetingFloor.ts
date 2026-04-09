import { useState, useEffect, useCallback } from 'react';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/orbit/services/supabaseClient';

export interface MeetingFloorState {
  activeSpeakerId: string | null;
  leasedUntil: string | null;
}

export function useMeetingFloor(roomName: string, userId: string) {
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [leasedUntil, setLeasedUntil] = useState<string | null>(null);

  // Computed state: Am I the current floor holder?
  const isFloorHolder = activeSpeakerId === userId;

  // Get the meeting ID from sessionStorage or fallback to roomName
  const getMeetingId = useCallback(() => {
    if (typeof window !== 'undefined') {
      const meetingId = sessionStorage.getItem('eburon_meeting_id');
      return meetingId || roomName;
    }
    return roomName;
  }, [roomName]);

  useEffect(() => {
    if (!roomName) return;

    // Fetch initial state
    const fetchFloorState = async () => {
      const meetingId = getMeetingId();
      const { data, error } = await supabase
        .from('meeting_floor')
        .select('*')
        .eq('meeting_id', meetingId)
        .maybeSingle(); // Use maybeSingle to avoid 406 on empty result
      
      if (data) {
        setActiveSpeakerId(data.active_speaker_id);
        setLeasedUntil(data.leased_until);
      } else {
        // Row doesn't exist yet, we can try to claim it if we are the first
        claimFloor(); 
      }
    };

    fetchFloorState();

    // Subscribe to changes
    const channel = supabase
      .channel(`floor:${getMeetingId()}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'meeting_floor',
        filter: `meeting_id=eq.${getMeetingId()}`
      }, (payload: RealtimePostgresChangesPayload<any>) => {
        console.log('🎤 Floor update:', payload);
        if (payload.new) {
          // @ts-ignore
          setActiveSpeakerId(payload.new.active_speaker_id);
          // @ts-ignore
          setLeasedUntil(payload.new.leased_until);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomName, getMeetingId]);

  const claimFloor = useCallback(async () => {
    if (!roomName || !userId) return;

    const meetingId = getMeetingId();
    const leaseTime = new Date();
    leaseTime.setHours(leaseTime.getHours() + 1); // 1 hour lease

    const { error } = await supabase
      .from('meeting_floor')
      .upsert({
        meeting_id: meetingId,
        active_speaker_id: userId,
        leased_until: leaseTime.toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to claim floor:', error);
    } else {
      setActiveSpeakerId(userId);
      setLeasedUntil(leaseTime.toISOString());
    }
  }, [roomName, userId, getMeetingId]);

  const grantFloor = useCallback(async (targetUserId: string) => {
    if (!roomName) return;

    const meetingId = getMeetingId();
    const leaseTime = new Date();
    leaseTime.setHours(leaseTime.getHours() + 1);

    const { error } = await supabase
      .from('meeting_floor')
      .upsert({
        meeting_id: meetingId,
        active_speaker_id: targetUserId,
        leased_until: leaseTime.toISOString(),
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to grant floor:', error);
    } else {
      setActiveSpeakerId(targetUserId);
      setLeasedUntil(leaseTime.toISOString());
    }
  }, [roomName, getMeetingId]);

  const releaseFloor = useCallback(async () => {
    if (!roomName || !userId) return;

    const meetingId = getMeetingId();
    const { error } = await supabase
      .from('meeting_floor')
      .upsert({
        meeting_id: meetingId,
        active_speaker_id: null,
        leased_until: null,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to release floor:', error);
    } else {
      setActiveSpeakerId(null);
      setLeasedUntil(null);
    }
  }, [roomName, userId, getMeetingId]);

  return {
    activeSpeakerId,
    isFloorHolder,
    claimFloor,
    grantFloor,
    releaseFloor
  };
}
