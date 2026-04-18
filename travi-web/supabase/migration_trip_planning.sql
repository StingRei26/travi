-- ══════════════════════════════════════════════════════════════════════════
-- Migration: Add Collaborative Trip Planning Tables
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════════════════

-- ── 0. Saved Stops (bookmarked stops from other users' traviis) ──────────

create table if not exists public.saved_stops (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete cascade not null,
  original_stop_id   uuid not null,
  original_travi_id  uuid not null,
  name               text not null,
  location           text,
  rating             integer,
  review             text,
  type               text,
  emoji              text,
  image_url          text,
  image_urls         text[] default '{}',
  source_user_name   text,
  source_travi_title text,
  created_at         timestamptz default now()
);

alter table public.saved_stops enable row level security;

create policy "Users can view own saved stops"
  on public.saved_stops for select using (user_id = auth.uid());

create policy "Users can insert own saved stops"
  on public.saved_stops for insert with check (user_id = auth.uid());

create policy "Users can delete own saved stops"
  on public.saved_stops for delete using (user_id = auth.uid());

-- ── 0.5. Travi Shares (invite-based sharing for individual traviis) ──────

create table if not exists public.travi_shares (
  id            uuid primary key default gen_random_uuid(),
  travi_id      uuid not null,
  inviter_id    uuid references auth.users(id) on delete cascade not null,
  invited_email text not null,
  token         text unique not null,
  accepted_by   uuid references auth.users(id),
  accepted_at   timestamptz,
  created_at    timestamptz default now()
);

alter table public.travi_shares enable row level security;

create policy "Owners manage their shares"
  on public.travi_shares for all using (inviter_id = auth.uid());

create policy "Anyone can read shares by token"
  on public.travi_shares for select using (true);

create policy "Users can accept their own shares"
  on public.travi_shares for update using (true)
  with check (accepted_by = auth.uid());

-- ── 1. Trip Plans (collaborative planning boards) ────────────────────────

create table if not exists public.trip_plans (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references auth.users(id) on delete cascade not null,
  title           text not null,
  destination     text,
  country         text,
  country_flag    text,
  planned_date    text,
  description     text,
  cover_gradient  text default 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.trip_plans enable row level security;

create policy "Trip plans viewable by owner"
  on public.trip_plans for select using (owner_id = auth.uid());

create policy "Users can insert own trip plans"
  on public.trip_plans for insert with check (auth.uid() = owner_id);

create policy "Users can update own trip plans"
  on public.trip_plans for update using (owner_id = auth.uid());

create policy "Users can delete own trip plans"
  on public.trip_plans for delete using (owner_id = auth.uid());

-- ── 2. Trip Plan Collaborators ────────────────────────────────────────────

create table if not exists public.trip_plan_collaborators (
  id              uuid primary key default gen_random_uuid(),
  trip_plan_id    uuid references public.trip_plans(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade,
  invited_email   text,
  invite_token    text unique,
  status          text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  accepted_at     timestamptz,
  created_at      timestamptz default now()
);

alter table public.trip_plan_collaborators enable row level security;

create policy "Collaborators viewable by owner"
  on public.trip_plan_collaborators for select using (
    exists (
      select 1 from public.trip_plans
      where id = trip_plan_collaborators.trip_plan_id and owner_id = auth.uid()
    )
    or user_id = auth.uid()
    or invite_token is not null
  );

create policy "Owner can insert collaborators"
  on public.trip_plan_collaborators for insert with check (
    exists (
      select 1 from public.trip_plans
      where id = trip_plan_collaborators.trip_plan_id and owner_id = auth.uid()
    )
  );

create policy "Owner can delete collaborators"
  on public.trip_plan_collaborators for delete using (
    exists (
      select 1 from public.trip_plans
      where id = trip_plan_collaborators.trip_plan_id and owner_id = auth.uid()
    )
  );

create policy "Users can update their own collab record"
  on public.trip_plan_collaborators for update using (true)
  with check (user_id = auth.uid());

-- ── 3. Trip Plan Stops (planned stops for a trip) ─────────────────────────

create table if not exists public.trip_plan_stops (
  id              uuid primary key default gen_random_uuid(),
  trip_plan_id    uuid references public.trip_plans(id) on delete cascade not null,
  added_by        uuid references auth.users(id) on delete set null,
  name            text not null,
  location        text,
  type            text check (type in ('landmark', 'restaurant', 'activity', 'hotel', 'shopping', 'other')),
  emoji           text,
  notes           text,
  image_url       text,
  image_urls      text[] default '{}',
  source_stop_id  uuid,
  source_travi_id uuid,
  source_user_name text,
  order_index     integer default 0,
  created_at      timestamptz default now()
);

alter table public.trip_plan_stops enable row level security;

create policy "Plan stops viewable by owner"
  on public.trip_plan_stops for select using (
    exists (
      select 1 from public.trip_plans tp
      where tp.id = trip_plan_stops.trip_plan_id and tp.owner_id = auth.uid()
    )
  );

create policy "Owner can insert stops"
  on public.trip_plan_stops for insert with check (
    exists (
      select 1 from public.trip_plans tp
      where tp.id = trip_plan_stops.trip_plan_id and tp.owner_id = auth.uid()
    )
  );

create policy "Owner can update stops"
  on public.trip_plan_stops for update using (
    exists (
      select 1 from public.trip_plans tp
      where tp.id = trip_plan_stops.trip_plan_id and tp.owner_id = auth.uid()
    )
  );

create policy "Owner can delete stops"
  on public.trip_plan_stops for delete using (
    exists (
      select 1 from public.trip_plans tp
      where tp.id = trip_plan_stops.trip_plan_id and tp.owner_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════════
-- Done! The trip planning feature is now ready to use.
-- ══════════════════════════════════════════════════════════════════════════
