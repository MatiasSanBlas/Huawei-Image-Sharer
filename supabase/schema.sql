-- ============================================
-- Supabase SQL: Tables for Huawei Image Sharer
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable RLS
alter default privileges in schema public grant select, insert on tables to anon, authenticated;

-- Share logs table: tracks every share operation
create table if not exists public.share_logs (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  image_id      text not null,
  target_type   text not null check (target_type in ('project', 'domain', 'ou_urn')),
  target_value  text not null,
  status        text not null check (status in ('success', 'failed')),
  error_message text,
  created_at    timestamptz default now()
);

-- RLS policies
alter table public.share_logs enable row level security;

-- Users can only see their own share logs
create policy "Users can view own share logs"
  on public.share_logs for select
  using (auth.uid() = user_id);

-- Users can insert their own share logs
create policy "Users can insert own share logs"
  on public.share_logs for insert
  with check (auth.uid() = user_id);

-- Index for faster lookups
create index if not exists idx_share_logs_user on public.share_logs(user_id);
create index if not exists idx_share_logs_image on public.share_logs(image_id);
