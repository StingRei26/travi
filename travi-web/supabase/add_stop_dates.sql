-- ═══════════════════════════════════════════════════════════
--  Travi — Add start_date / end_date columns to stops table
--  Run once in Supabase SQL Editor.
--  Allows stops to have either:
--    • a single date (e.g. dinner reservation)        → start_date set, end_date null
--    • a date range  (e.g. multi-night hotel stay)    → both set
--    • no date at all                                 → both null
-- ═══════════════════════════════════════════════════════════

alter table public.stops add column if not exists start_date date;
alter table public.stops add column if not exists end_date   date;

-- Sanity index for sorting stops chronologically inside a Travi
create index if not exists stops_start_date_idx on public.stops (travi_id, start_date);
