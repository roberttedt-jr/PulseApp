-- Pulse social v1: private activity between friends.

alter table profiles add column if not exists username text;
alter table profiles add column if not exists bio text;
alter table profiles add column if not exists profile_visibility text not null default 'private';
alter table profiles add column if not exists default_workout_visibility text not null default 'me';
alter table profiles add column if not exists share_volume boolean not null default false;
alter table profiles add column if not exists share_prs boolean not null default false;

create unique index if not exists profiles_username_lower_idx on profiles (lower(username));

update profiles
set profile_visibility = 'public'
where public_profile = true and username is null;

alter table follows add column if not exists status text not null default 'accepted';
create index if not exists follows_following_status_idx on follows (following_id, status);
create index if not exists follows_follower_status_idx on follows (follower_id, status);

alter table activity_feed add column if not exists visibility text not null default 'followers';
alter table activity_feed add column if not exists deleted_at timestamptz;
alter table activity_feed add column if not exists share_volume boolean not null default false;
alter table activity_feed add column if not exists share_prs boolean not null default false;
alter table activity_feed add column if not exists exercise_count integer;
alter table activity_feed add column if not exists set_count integer;
alter table activity_feed add column if not exists muscles text;
alter table activity_feed add column if not exists pr_label text;

create index if not exists activity_feed_live_idx on activity_feed (created_at desc, id desc) where deleted_at is null;
create index if not exists activity_feed_author_live_idx on activity_feed (user_id, created_at desc) where deleted_at is null;

create table if not exists user_blocks (
  blocker_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table if not exists reports (
  id text primary key,
  reporter_id text not null,
  target_type text not null,
  target_id text not null,
  reason text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);

create table if not exists hidden_posts (
  user_id text not null,
  post_id text not null references activity_feed(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists reports_status_idx on reports (status, created_at desc);
create index if not exists reports_reporter_idx on reports (reporter_id);
create index if not exists user_blocks_blocked_idx on user_blocks (blocked_id);
create index if not exists hidden_posts_post_idx on hidden_posts (post_id);
