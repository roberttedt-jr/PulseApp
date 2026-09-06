-- Pulse v3: honest HealthKit-ready metadata, avatar notify prefs

alter table profiles add column if not exists healthkit_notify boolean not null default false;

alter table workouts add column if not exists source text not null default 'manual';
alter table workouts add column if not exists external_id text;
alter table workouts add column if not exists imported_at timestamptz;

alter table body_logs add column if not exists source text not null default 'manual';
alter table body_logs add column if not exists external_id text;
alter table body_logs add column if not exists imported_at timestamptz;

create unique index if not exists workouts_user_external_uidx
  on workouts (user_id, external_id)
  where external_id is not null;

create unique index if not exists body_logs_user_external_uidx
  on body_logs (user_id, external_id)
  where external_id is not null;
