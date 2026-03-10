-- ============================================================
-- MY WORD — DATABASE SCHEMA
-- Run this in Supabase SQL Editor for BOTH projects
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── USERS (extends Supabase auth.users) ──────────────────────
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text not null,
  identity_mode text not null check (identity_mode in ('named', 'anonymous')),
  noname_number integer unique,
  avatar_storage_path text,
  created_at timestamptz default now()
);

-- Auto-assign noname_number for anonymous users
create sequence noname_seq start 1;

create or replace function assign_noname_number()
returns trigger as $$
begin
  if new.identity_mode = 'anonymous' and new.noname_number is null then
    new.noname_number := nextval('noname_seq');
  end if;
  return new;
end;
$$ language plpgsql;

create trigger assign_noname_before_insert
  before insert on public.users
  for each row execute function assign_noname_number();

-- ── GROUPS ───────────────────────────────────────────────────
create table public.groups (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  project_type text not null default 'alphabet',
  admin_ids uuid[] not null default '{}',
  start_date date not null,
  timezone text not null default 'Europe/London',
  locked boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- ── GROUP MEMBERS ─────────────────────────────────────────────
create table public.group_members (
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- ── INVITATIONS ───────────────────────────────────────────────
create table public.invitations (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  email text not null,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted boolean not null default false,
  created_at timestamptz default now()
);

-- ── WEEKS ────────────────────────────────────────────────────
create table public.weeks (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  week_num integer not null check (week_num between 1 and 26),
  letter char(1) not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  revealed_at timestamptz,
  unique(group_id, week_num)
);

-- Function to auto-generate 26 weeks when a group is created
create or replace function generate_weeks_for_group()
returns trigger as $$
declare
  letters char[] := array['A','B','C','D','E','F','G','H','I','J','K','L','M',
                           'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'];
  i integer;
  week_start timestamptz;
begin
  for i in 1..26 loop
    -- Each week opens on Wednesday 00:01, closes following Tuesday 23:59
    week_start := (new.start_date + ((i - 1) * 7) * interval '1 day')::timestamptz
                  at time zone new.timezone;
    insert into public.weeks (group_id, week_num, letter, opens_at, closes_at)
    values (
      new.id,
      i,
      letters[i],
      week_start + interval '1 minute',
      week_start + interval '7 days' - interval '1 minute'
    );
  end loop;
  return new;
end;
$$ language plpgsql;

create trigger generate_weeks_after_group_insert
  after insert on public.groups
  for each row execute function generate_weeks_for_group();

-- ── SUBMISSIONS ───────────────────────────────────────────────
create table public.submissions (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  week_id uuid references public.weeks(id) on delete cascade,
  word_title text not null,
  body_html text not null default '',
  word_count integer not null default 0,
  is_late_catchup boolean not null default false,
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_id, is_late_catchup)
);

-- ── SUBMISSION IMAGES ─────────────────────────────────────────
create table public.submission_images (
  id uuid default uuid_generate_v4() primary key,
  submission_id uuid references public.submissions(id) on delete cascade,
  storage_path text not null,
  position_index integer not null default 0,
  created_at timestamptz default now()
);

-- ── SCORES ───────────────────────────────────────────────────
create table public.scores (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references public.groups(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  week_id uuid references public.weeks(id) on delete cascade,
  score integer not null default 0 check (score in (0, 1)),
  is_late boolean not null default false,
  created_at timestamptz default now(),
  unique(group_id, user_id, week_id)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.invitations enable row level security;
alter table public.weeks enable row level security;
alter table public.submissions enable row level security;
alter table public.submission_images enable row level security;
alter table public.scores enable row level security;

-- Users: read own profile, insert own, update own
create policy "Users can read own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.users
  for update using (auth.uid() = id);

-- Group members can read all users in their groups
create policy "Group members can read co-member profiles" on public.users
  for select using (
    exists (
      select 1 from public.group_members gm1
      join public.group_members gm2 on gm1.group_id = gm2.group_id
      where gm1.user_id = auth.uid() and gm2.user_id = public.users.id
    )
  );

-- Groups: members can read their groups
create policy "Members can read their groups" on public.groups
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = public.groups.id and user_id = auth.uid()
    )
  );

create policy "Authenticated users can create groups" on public.groups
  for insert with check (auth.uid() is not null);

create policy "Admins can update their groups" on public.groups
  for update using (auth.uid() = any(admin_ids));

-- Group members policies
create policy "Members can read group membership" on public.group_members
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = public.group_members.group_id and gm.user_id = auth.uid()
    )
  );

create policy "Admins can manage members" on public.group_members
  for all using (
    exists (
      select 1 from public.groups
      where id = public.group_members.group_id and auth.uid() = any(admin_ids)
    )
  );

-- Weeks: group members can read
create policy "Members can read weeks" on public.weeks
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = public.weeks.group_id and user_id = auth.uid()
    )
  );

-- Submissions: members can read revealed submissions + own
create policy "Members can read revealed submissions" on public.submissions
  for select using (
    exists (
      select 1 from public.group_members gm
      join public.weeks w on w.id = public.submissions.week_id
      where gm.group_id = public.submissions.group_id
        and gm.user_id = auth.uid()
        and (w.revealed_at is not null or public.submissions.user_id = auth.uid())
    )
  );

create policy "Members can insert own submissions" on public.submissions
  for insert with check (auth.uid() = user_id);

create policy "Members can update own submissions before close" on public.submissions
  for update using (
    auth.uid() = user_id
    and exists (
      select 1 from public.weeks
      where id = public.submissions.week_id and closes_at > now()
    )
  );

-- Scores: group members can read
create policy "Members can read scores" on public.scores
  for select using (
    exists (
      select 1 from public.group_members
      where group_id = public.scores.group_id and user_id = auth.uid()
    )
  );

-- ============================================================
-- STORAGE BUCKETS
-- Run these separately in Supabase Storage settings
-- ============================================================
-- Create bucket: avatars (public)
-- Create bucket: submission-images (public)
