-- ============================================
-- Supabase SQL: Tables for Huawei Image Sharer
-- Run this in the Supabase SQL Editor
-- ============================================

alter default privileges in schema public grant select, insert on tables to anon, authenticated;

-- ============================================
-- Share logs
-- ============================================

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

alter table public.share_logs enable row level security;

create policy "Users can view own share logs"
  on public.share_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own share logs"
  on public.share_logs for insert
  with check (auth.uid() = user_id);

create index if not exists idx_share_logs_user on public.share_logs(user_id);
create index if not exists idx_share_logs_image on public.share_logs(image_id);

-- ============================================
-- User profiles (approval system)
-- ============================================

create table if not exists public.user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  role       text not null default 'user' check (role in ('admin', 'user')),
  status     text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz default now()
);

alter table public.user_profiles enable row level security;

create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Admins can view all profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update profiles"
  on public.user_profiles for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create index if not exists idx_user_profiles_status on public.user_profiles(status);

-- ============================================
-- Trigger: auto-create profile on signup
-- ============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, role, status)
  values (
    new.id,
    new.email,
    'user',
    'pending'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
