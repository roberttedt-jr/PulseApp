alter table workout_sets
  add column if not exists set_kind text not null default 'work';
