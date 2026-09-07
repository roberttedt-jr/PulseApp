-- Pulse social v3: workouts-only feed, session photos/captions, notifications.

alter table activity_feed add column if not exists caption text;
alter table activity_feed add column if not exists photos text;
alter table activity_feed add column if not exists exercises_json text;

create table if not exists notifications (
  id text primary key,
  user_id text not null,
  actor_id text not null,
  type text not null,
  post_id text,
  workout_title text,
  comment_preview text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on notifications (user_id, created_at desc);

create index if not exists notifications_unread_idx
  on notifications (user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_actor_type_post_idx
  on notifications (actor_id, type, post_id);
