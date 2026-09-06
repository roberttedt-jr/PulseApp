-- Pulse v4: optional RPE, PR kinds, per-exercise session notes

alter table profiles add column if not exists show_rpe boolean not null default true;

alter table personal_records add column if not exists kind text not null default 'one_rm';
alter table personal_records add column if not exists volume double precision;

create table if not exists workout_block_notes (
  workout_id text not null references workouts(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  notes text,
  primary key (workout_id, exercise_id)
);

create index if not exists personal_records_user_ex_kind_idx
  on personal_records (user_id, exercise_id, kind);
