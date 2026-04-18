-- ═══════════════════════════════════════════════════
--  Travi — Supabase schema (idempotent — safe to re-run)
--  Paste this into your Supabase SQL Editor and run.
-- ═══════════════════════════════════════════════════

-- ── 1. Profiles (extends auth.users) ──────────────

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null default '',
  handle     text unique not null default '',
  avatar     text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are publicly readable" on public.profiles;
drop policy if exists "Users can insert own profile"   on public.profiles;
drop policy if exists "Users can update own profile"   on public.profiles;

create policy "Profiles are publicly readable"
  on public.profiles for select using (true);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── 2. Traviis ────────────────────────────────────

create table if not exists public.traviis (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  title           text not null,
  description     text,
  country         text,
  country_flag    text,
  emoji           text,
  cover_gradient  text,
  cover_image_url text,
  start_date      text,
  end_date        text,
  is_public       boolean default true,
  tags            text[],
  created_at      timestamptz default now()
);

-- Add column if table already existed without it
alter table public.traviis add column if not exists cover_image_url text;

alter table public.traviis enable row level security;

drop policy if exists "Public traviis viewable by everyone" on public.traviis;
drop policy if exists "Users can insert own traviis"        on public.traviis;
drop policy if exists "Users can update own traviis"        on public.traviis;
drop policy if exists "Users can delete own traviis"        on public.traviis;

create policy "Public traviis viewable by everyone"
  on public.traviis for select
  using (
    is_public = true
    or auth.uid() = user_id
    or exists (
      select 1 from public.travi_shares
      where travi_id = traviis.id and accepted_by = auth.uid()
    )
  );

create policy "Users can insert own traviis"
  on public.traviis for insert with check (auth.uid() = user_id);

create policy "Users can update own traviis"
  on public.traviis for update using (auth.uid() = user_id);

create policy "Users can delete own traviis"
  on public.traviis for delete using (auth.uid() = user_id);

-- ── 3. Stops ──────────────────────────────────────

create table if not exists public.stops (
  id          uuid primary key default gen_random_uuid(),
  travi_id    uuid references public.traviis(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  name        text not null,
  location    text,
  date        text,
  rating      integer default 5 check (rating between 1 and 5),
  review      text,
  type        text check (type in ('hotel', 'restaurant', 'attraction', 'experience')),
  emoji       text,
  image_url   text,
  image_urls  text[] default '{}',
  order_index integer default 0,
  created_at  timestamptz default now()
);

-- Add columns if table already existed without them
alter table public.stops add column if not exists image_url text;
alter table public.stops add column if not exists image_urls text[] default '{}';

alter table public.stops enable row level security;

drop policy if exists "Stops viewable if parent travi is viewable" on public.stops;
drop policy if exists "Users can insert own stops"                 on public.stops;
drop policy if exists "Users can update own stops"                 on public.stops;
drop policy if exists "Users can delete own stops"                 on public.stops;

create policy "Stops viewable if parent travi is viewable"
  on public.stops for select using (
    exists (
      select 1 from public.traviis
      where id = stops.travi_id
        and (
          is_public = true
          or auth.uid() = user_id
          or exists (
            select 1 from public.travi_shares
            where travi_id = stops.travi_id and accepted_by = auth.uid()
          )
        )
    )
  );

create policy "Users can insert own stops"
  on public.stops for insert with check (auth.uid() = user_id);

create policy "Users can update own stops"
  on public.stops for update using (auth.uid() = user_id);

create policy "Users can delete own stops"
  on public.stops for delete using (auth.uid() = user_id);

-- ── 4. Travi Shares (invite-based sharing) ────────

create table if not exists public.travi_shares (
  id            uuid primary key default gen_random_uuid(),
  travi_id      uuid references public.traviis(id) on delete cascade not null,
  inviter_id    uuid references auth.users(id) on delete cascade not null,
  invited_email text not null,
  token         text unique not null,
  accepted_by   uuid references auth.users(id),
  accepted_at   timestamptz,
  created_at    timestamptz default now()
);

alter table public.travi_shares enable row level security;

drop policy if exists "Owners manage their shares"          on public.travi_shares;
drop policy if exists "Anyone can read shares by token"     on public.travi_shares;
drop policy if exists "Users can accept their own shares"   on public.travi_shares;

-- Owner can see/insert/delete their own shares
create policy "Owners manage their shares"
  on public.travi_shares for all
  using (inviter_id = auth.uid());

-- Public select so invite landing page can look up a token (token is 256-bit — unguessable)
create policy "Anyone can read shares by token"
  on public.travi_shares for select
  using (true);

-- Logged-in users can accept a share (set accepted_by / accepted_at)
create policy "Users can accept their own shares"
  on public.travi_shares for update
  using (true)
  with check (accepted_by = auth.uid());

-- ── 5. Storage bucket for images ──────────────────

insert into storage.buckets (id, name, public)
values ('travi-images', 'travi-images', true)
on conflict (id) do nothing;

drop policy if exists "Anyone can read travi images"                on storage.objects;
drop policy if exists "Authenticated users can upload travi images" on storage.objects;
drop policy if exists "Users can update own travi images"           on storage.objects;
drop policy if exists "Users can delete own travi images"           on storage.objects;

create policy "Anyone can read travi images"
  on storage.objects for select
  using (bucket_id = 'travi-images');

create policy "Authenticated users can upload travi images"
  on storage.objects for insert
  with check (bucket_id = 'travi-images' and auth.role() = 'authenticated');

create policy "Users can update own travi images"
  on storage.objects for update
  using (bucket_id = 'travi-images' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Users can delete own travi images"
  on storage.objects for delete
  using (bucket_id = 'travi-images' and auth.uid()::text = (storage.foldername(name))[1]);

-- ── 5. Auto-create profile on signup ──────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  base_handle text;
  final_handle text;
  counter int := 0;
begin
  base_handle := '@' || regexp_replace(
    lower(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))),
    '[^a-z0-9]', '', 'g'
  );

  -- ensure handle uniqueness
  final_handle := base_handle;
  loop
    exit when not exists (
      select 1 from public.profiles where handle = final_handle
    );
    counter := counter + 1;
    final_handle := base_handle || counter::text;
  end loop;

  insert into public.profiles (id, name, handle, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    final_handle,
    new.raw_user_meta_data->>'avatar_url'
  );

  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 6. Saved Stops (bookmark stops from other traviis) ────────

create table if not exists public.saved_stops (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  original_stop_id uuid references public.stops(id) on delete cascade not null,
  original_travi_id uuid references public.traviis(id) on delete cascade not null,
  -- Denormalized data (in case original is deleted, we keep the info)
  name            text not null,
  location        text,
  rating          integer default 5,
  review          text,
  type            text,
  emoji           text,
  image_url       text,
  image_urls      text[] default '{}',
  source_user_name text,
  source_travi_title text,
  created_at      timestamptz default now(),
  unique(user_id, original_stop_id)
);

alter table public.saved_stops enable row level security;

drop policy if exists "Users can view own saved stops" on public.saved_stops;
drop policy if exists "Users can insert own saved stops" on public.saved_stops;
drop policy if exists "Users can delete own saved stops" on public.saved_stops;

create policy "Users can view own saved stops"
  on public.saved_stops for select using (auth.uid() = user_id);

create policy "Users can insert own saved stops"
  on public.saved_stops for insert with check (auth.uid() = user_id);

create policy "Users can delete own saved stops"
  on public.saved_stops for delete using (auth.uid() = user_id);

-- ── 7. Trip Plans (collaborative trip planning) ───────────────

create table if not exists public.trip_plans (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid references auth.users(id) on delete cascade not null,
  title           text not null,
  destination     text,
  country         text,
  country_flag    text,
  planned_date    text,
  description     text,
  cover_gradient  text,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.trip_plans enable row level security;

drop policy if exists "Trip plans viewable by owner and collaborators" on public.trip_plans;
drop policy if exists "Users can insert own trip plans" on public.trip_plans;
drop policy if exists "Users can update own trip plans" on public.trip_plans;
drop policy if exists "Users can delete own trip plans" on public.trip_plans;

create policy "Trip plans viewable by owner and collaborators"
  on public.trip_plans for select using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.trip_plan_collaborators
      where trip_plan_id = trip_plans.id and user_id = auth.uid()
    )
  );

create policy "Users can insert own trip plans"
  on public.trip_plans for insert with check (auth.uid() = owner_id);

create policy "Users can update own trip plans"
  on public.trip_plans for update using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.trip_plan_collaborators
      where trip_plan_id = trip_plans.id and user_id = auth.uid()
    )
  );

create policy "Users can delete own trip plans"
  on public.trip_plans for delete using (auth.uid() = owner_id);

-- ── 8. Trip Plan Collaborators ────────────────────────────────

create table if not exists public.trip_plan_collaborators (
  id              uuid primary key default gen_random_uuid(),
  trip_plan_id    uuid references public.trip_plans(id) on delete cascade not null,
  user_id         uuid references auth.users(id) on delete cascade,
  invited_email   text,
  invite_token    text unique,
  status          text default 'pending' check (status in ('pending', 'accepted', 'declined')),
  accepted_at     timestamptz,
  created_at      timestamptz default now(),
  unique(trip_plan_id, user_id),
  unique(trip_plan_id, invited_email)
);

alter table public.trip_plan_collaborators enable row level security;

drop policy if exists "Collaborators viewable by plan members" on public.trip_plan_collaborators;
drop policy if exists "Owner can manage collaborators" on public.trip_plan_collaborators;
drop policy if exists "Users can accept invites" on public.trip_plan_collaborators;
drop policy if exists "Anyone can view by token" on public.trip_plan_collaborators;

create policy "Collaborators viewable by plan members"
  on public.trip_plan_collaborators for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.trip_plans
      where id = trip_plan_collaborators.trip_plan_id and owner_id = auth.uid()
    )
  );

create policy "Owner can manage collaborators"
  on public.trip_plan_collaborators for all using (
    exists (
      select 1 from public.trip_plans
      where id = trip_plan_collaborators.trip_plan_id and owner_id = auth.uid()
    )
  );

create policy "Users can accept invites"
  on public.trip_plan_collaborators for update using (true)
  with check (user_id = auth.uid());

create policy "Anyone can view by token"
  on public.trip_plan_collaborators for select using (invite_token is not null);

-- ── 9. Trip Plan Stops (planned stops for a trip) ─────────────

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
  source_stop_id  uuid references public.stops(id) on delete set null,
  source_travi_id uuid references public.traviis(id) on delete set null,
  source_user_name text,
  order_index     integer default 0,
  created_at      timestamptz default now()
);

alter table public.trip_plan_stops enable row level security;

drop policy if exists "Plan stops viewable by plan members" on public.trip_plan_stops;
drop policy if exists "Plan members can manage stops" on public.trip_plan_stops;

create policy "Plan stops viewable by plan members"
  on public.trip_plan_stops for select using (
    exists (
      select 1 from public.trip_plans tp
      where tp.id = trip_plan_stops.trip_plan_id
        and (
          tp.owner_id = auth.uid()
          or exists (
            select 1 from public.trip_plan_collaborators
            where trip_plan_id = tp.id and user_id = auth.uid()
          )
        )
    )
  );

create policy "Plan members can manage stops"
  on public.trip_plan_stops for all using (
    exists (
      select 1 from public.trip_plans tp
      where tp.id = trip_plan_stops.trip_plan_id
        and (
          tp.owner_id = auth.uid()
          or exists (
            select 1 from public.trip_plan_collaborators
            where trip_plan_id = tp.id and user_id = auth.uid()
          )
        )
    )
  );

-- Enable realtime for collaborative editing
alter publication supabase_realtime add table public.trip_plan_stops;
alter publication supabase_realtime add table public.trip_plan_collaborators;
