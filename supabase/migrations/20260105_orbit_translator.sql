-- Namespace (Optional: If you don't want to expose the 'orbit' schema in Supabase settings, 
-- you can change 'public.' to 'public.' throughout this file)
create schema if not exists public;

-- 1) Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text unique,
  name text,
  created_at timestamptz not null default now()
);

-- 2) Room State (ONE row per room) => single speaker lock
create table if not exists public.room_state (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  active_speaker_user_id uuid null,
  active_speaker_since timestamptz null,
  lock_version bigint not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_orbit_room_state_active_speaker
  on public.room_state(active_speaker_user_id);

-- 3) Participants (per room)
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text,
  preferred_language text not null default 'en',
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique(room_id, user_id)
);

create index if not exists idx_orbit_participants_room
  on public.participants(room_id);

-- 4) Utterances (WebSpeech FINAL segments)
create table if not exists public.utterances (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  speaker_user_id uuid not null,
  source_language text not null default 'auto',
  text text not null,
  ended_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orbit_utterances_room_created
  on public.utterances(room_id, created_at);

-- 5) Translations (Ollama output per utterance per target lang)
create table if not exists public.translations (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  utterance_id uuid not null references public.utterances(id) on delete cascade,
  listener_user_id uuid null, -- if per-user; else null for shared
  target_language text not null,
  translated_text text not null,
  model text not null default 'gemini-3-flash-preview',
  created_at timestamptz not null default now(),
  unique(utterance_id, listener_user_id, target_language)
);

create index if not exists idx_orbit_translations_room_created
  on public.translations(room_id, created_at);

create index if not exists idx_orbit_translations_utt_lang
  on public.translations(utterance_id, target_language);

-- 6) TTS Events (Cartesia playback audit per listener)
create table if not exists public.tts_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  utterance_id uuid null references public.utterances(id) on delete set null,
  translation_id uuid null references public.translations(id) on delete set null,
  listener_user_id uuid not null,
  provider text not null default 'cartesia',
  voice_id text null,
  status text not null default 'queued', -- queued | playing | done | error
  error text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_orbit_tts_room_listener_created
  on public.tts_events(room_id, listener_user_id, created_at);

-- ===========================
-- RPC: room_state helper (Handles Room Code lookup/creation)
-- ===========================
create or replace function public.ensure_room_state(p_room_code text)
returns uuid
language plpgsql
as $$
declare
  v_room_id uuid;
begin
  -- 1. Ensure room exists in public.rooms
  insert into public.rooms (room_code, name)
  values (p_room_code, p_room_code)
  on conflict (room_code) do update set name = excluded.name
  returning id into v_room_id;

  -- 2. Ensure room state exists
  insert into public.room_state (room_id)
  values (v_room_id)
  on conflict (room_id) do nothing;

  return v_room_id;
end;
$$;

-- ===========================
-- RPC: Acquire speaker lock
-- ===========================
create or replace function public.acquire_speaker_lock(p_room_code text, p_user_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_room_id uuid;
  v_active uuid;
begin
  v_room_id := public.ensure_room_state(p_room_code);

  select active_speaker_user_id into v_active
  from public.room_state
  where room_id = v_room_id
  for update;

  if v_active is null then
    update public.room_state
    set active_speaker_user_id = p_user_id,
        active_speaker_since = now(),
        lock_version = lock_version + 1,
        updated_at = now()
    where room_id = v_room_id;
    return true;
  end if;

  if v_active = p_user_id then
    return true; -- idempotent
  end if;

  return false;
end;
$$;

-- ===========================
-- RPC: Release speaker lock
-- ===========================
create or replace function public.release_speaker_lock(p_room_code text, p_user_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_room_id uuid;
  v_active uuid;
begin
  v_room_id := public.ensure_room_state(p_room_code);

  select active_speaker_user_id into v_active
  from public.room_state
  where room_id = v_room_id
  for update;

  if v_active is null then
    return true;
  end if;

  if v_active <> p_user_id then
    return false;
  end if;

  update public.room_state
  set active_speaker_user_id = null,
      active_speaker_since = null,
      lock_version = lock_version + 1,
      updated_at = now()
    where room_id = v_room_id;

  return true;
end;
$$;

-- ===========================
-- REALTIME SETUP
-- ===========================
-- Enable real-time for the tables we need to watch (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.room_state;
EXCEPTION WHEN duplicate_object THEN
  -- Already added, ignore
END;
$$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.utterances;
EXCEPTION WHEN duplicate_object THEN
  -- Already added, ignore
END;
$$;

-- 7) Transcriptions (Real-time segments)
-- DROP to ensure schema update (User reported column mismatch)
DROP TABLE IF EXISTS public.transcriptions CASCADE;

create table if not exists public.transcriptions (
  id uuid not null default gen_random_uuid (),
  meeting_id text not null,
  speaker_id uuid not null,
  transcribe_text_segment text not null,
  full_transcription text,
  users_all text[],
  created_at timestamp with time zone null default now(),
  constraint transcriptions_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_transcriptions_meeting_id on public.transcriptions using btree (meeting_id, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_orbit_transcriptions_meeting on public.transcriptions using btree (meeting_id) TABLESPACE pg_default;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.transcriptions;
EXCEPTION WHEN duplicate_object THEN
  -- Already added
END;
$$;

-- 8) Meetings Table (Missing dependency for joinMeetingDB)
create table if not exists public.meetings (
  id uuid not null default gen_random_uuid(),
  meeting_id text not null,
  host_id uuid null,
  created_at timestamp with time zone null default now(),
  constraint meetings_pkey primary key (id),
  constraint meetings_meeting_id_key unique (meeting_id)
) TABLESPACE pg_default;

create index IF not exists idx_meetings_meeting_id on public.meetings using btree (meeting_id) TABLESPACE pg_default;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
EXCEPTION WHEN duplicate_object THEN
  -- Already added
END;
$$;
