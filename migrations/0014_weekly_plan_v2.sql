-- Pulse 3.6: structured weekly plan (routine | template | rest)
alter table weekly_plan add column if not exists kind text;
alter table weekly_plan add column if not exists template_key text;

update weekly_plan
  set kind = case when routine_id is null then 'rest' else 'routine' end
  where kind is null;

create index if not exists weekly_plan_user_weekday_idx on weekly_plan (user_id, weekday);
