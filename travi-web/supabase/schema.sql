-- ═══════════════════════════════════════════════════
--  Travi — Supabase schema
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
  start_date      text,
  end_date        text,
  is_public       boolean default true,
  tags            text[],
  cover_image_url text,
  created_at      timestamptz default now()
);

alter table public.traviis enable row level security;

create policy "Public traviis viewable by everyone"
  on public.traviis for select
  using (is_public = true or auth.uid() = user_id);

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
  order_index integer default 0,
  created_at  timestamptz default now()
);

alter table public.stops enable row level security;

create policy "Stops viewable if parent travi is viewable"
  on public.stops for select using (
    exists (
      select 1 from public.traviis
      where id = stops.travi_id
        and (is_public = true or auth.uid() = user_id)
    )
  );

create policy "Users can insert own stops"
  on public.stops for insert with check (auth.uid() = user_id);

create policy "Users can update own stops"
  on public.stops for update using (auth.uid() = user_id);

create policy "Users can delete own stops"
  on public.stops for delete using (auth.uid() = user_id);

-- ── 4. Alter existing tables (run if tables already exist) ────────

alter table public.traviis add column if not exists cover_image_url text;
alter table public.stops    add column if not exists image_url       text;



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

-- ── 5. Storage bucket for images ──────────────────

insert into storage.buckets (id, name, public)
values ('travi-images', 'travi-images', true)
on conflict (id) do nothing;

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

-- ── 6. Auto-create profile on signup ──────────────

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
