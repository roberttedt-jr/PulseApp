-- Pulse compare v1: optional, private, healthy comparison between friends.
-- All flags default OFF. Master switch is compare_enabled; metrics are independent.

alter table profiles add column if not exists compare_enabled boolean not null default false;
alter table profiles add column if not exists compare_workouts boolean not null default false;
alter table profiles add column if not exists compare_days boolean not null default false;
alter table profiles add column if not exists compare_streak boolean not null default false;
alter table profiles add column if not exists compare_sets boolean not null default false;
alter table profiles add column if not exists compare_volume boolean not null default false;
alter table profiles add column if not exists compare_exercises boolean not null default false;
alter table profiles add column if not exists compare_prs boolean not null default false;
