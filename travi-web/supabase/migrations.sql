-- ═══════════════════════════════════════════════════
--  Travi — run this to apply all schema changes
--  Paste into Supabase SQL Editor and run.
--  Safe to run multiple times (idempotent).
-- ═══════════════════════════════════════════════════

-- Add image columns (safe to run multiple times)
alter table public.traviis add column if not exists cover_image_url text;
alter table public.stops    add column if not exists image_url       text;
alter table public.stops    add column if not exists image_urls      text[] default '{}';

-- Create storage bucket for images
insert into storage.buckets (id, name, public)
values ('travi-images', 'travi-images', true)
on conflict (id) do nothing;

-- Storage RLS policies (drop first to avoid duplicates)
drop policy if exists "Anyone can read travi images"             on storage.objects;
drop policy if exists "Authenticated users can upload travi images" on storage.objects;
drop policy if exists "Users can update own travi images"        on storage.objects;
drop policy if exists "Users can delete own travi images"        on storage.objects;

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

-- ── Sharing: travi_shares table ───────────────────
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

drop policy if exists "Owners manage their shares"        on public.travi_shares;
drop policy if exists "Anyone can read shares by token"   on public.travi_shares;
drop policy if exists "Users can accept their own shares" on public.travi_shares;

create policy "Owners manage their shares"
  on public.travi_shares for all
  using (inviter_id = auth.uid());

create policy "Anyone can read shares by token"
  on public.travi_shares for select
  using (true);

create policy "Users can accept their own shares"
  on public.travi_shares for update
  using (true)
  with check (accepted_by = auth.uid());

-- ── Update traviis RLS to allow shared access ─────
drop policy if exists "Public traviis viewable by everyone" on public.traviis;
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

-- ── Update stops RLS to allow shared access ───────
drop policy if exists "Stops viewable if parent travi is viewable" on public.stops;
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
