-- ═══════════════════════════════════════════════════
--  Travi — run this to apply new columns + storage
--  Paste into Supabase SQL Editor and run.
-- ═══════════════════════════════════════════════════

-- Add image columns (safe to run multiple times)
alter table public.traviis add column if not exists cover_image_url text;
alter table public.stops    add column if not exists image_url       text;

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
