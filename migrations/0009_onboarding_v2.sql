-- Pulse v5: split public onboarding from post-auth setup + tutorial.

alter table profiles add column if not exists experience_level text;
alter table profiles add column if not exists training_location text;
alter table profiles add column if not exists default_rest_seconds integer not null default 90;
alter table profiles add column if not exists setup_step integer not null default 0;
alter table profiles add column if not exists setup_completed_at timestamptz;
alter table profiles add column if not exists tutorial_completed_at timestamptz;

-- Existing accounts that already finished the previous mixed onboarding
-- skip the new setup + tutorial and land on the dashboard.
update profiles
set
  setup_completed_at = coalesce(setup_completed_at, updated_at, now()),
  tutorial_completed_at = coalesce(tutorial_completed_at, updated_at, now()),
  setup_step = 4
where onboarding_done = true
  and setup_completed_at is null;
