-- Pulse social v2: Para ti, comments, text posts, shareable routines.

alter table activity_feed add column if not exists routine_id text;

alter table feed_comments add column if not exists updated_at timestamptz;
alter table feed_comments add column if not exists deleted_at timestamptz;

create index if not exists feed_comments_live_idx
  on feed_comments (feed_id, created_at)
  where deleted_at is null;

create index if not exists activity_feed_public_live_idx
  on activity_feed (created_at desc, id desc)
  where deleted_at is null and visibility = 'public';

alter table routines add column if not exists visibility text not null default 'me';
alter table routines add column if not exists copied_from_id text;
alter table routines add column if not exists copied_from_user_id text;

update routines
set visibility = 'public'
where is_public = true and visibility = 'me';

create index if not exists routines_visibility_idx on routines (visibility) where visibility <> 'me';
create index if not exists routines_copied_from_idx on routines (copied_from_id);
