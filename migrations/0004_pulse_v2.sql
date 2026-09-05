-- Pulse v2: exercise media/cues, auto rest, feed likes & comments

alter table exercises add column if not exists video_url text;
alter table exercises add column if not exists instructions text;
alter table exercises add column if not exists common_mistakes text;
alter table exercises add column if not exists secondary_muscles text;

alter table profiles add column if not exists auto_rest boolean not null default true;

alter table activity_feed add column if not exists workout_id text;
alter table activity_feed add column if not exists volume double precision;
alter table activity_feed add column if not exists duration_seconds integer;

create table if not exists feed_likes (
  feed_id text not null references activity_feed(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (feed_id, user_id)
);

create table if not exists feed_comments (
  id text primary key,
  feed_id text not null references activity_feed(id) on delete cascade,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists feed_likes_user_idx on feed_likes (user_id);
create index if not exists feed_comments_feed_idx on feed_comments (feed_id, created_at);
create index if not exists feed_comments_user_idx on feed_comments (user_id);
create index if not exists workout_comments_workout_idx on workout_comments (workout_id, created_at);
create index if not exists workout_sets_completed_idx on workout_sets (workout_id) where completed = true;
create index if not exists activity_feed_created_idx on activity_feed (created_at desc);
