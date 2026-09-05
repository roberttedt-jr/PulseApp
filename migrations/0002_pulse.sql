-- Pulse gym tracker schema

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  image text,
  sex text,
  weight_kg double precision,
  height_cm integer,
  birth_date date,
  goal text,
  units text not null default 'metric',
  theme text not null default 'dark',
  rest_sound boolean not null default true,
  public_profile boolean not null default false,
  onboarding_done boolean not null default false,
  weekly_goal integer not null default 4,
  reminder_hour integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists exercises (
  id text primary key,
  name text not null,
  muscle text not null,
  type text not null,
  equipment text,
  gif_url text,
  is_custom boolean not null default false,
  user_id text
);

create index if not exists exercises_user_id_idx on exercises (user_id);
create index if not exists exercises_muscle_idx on exercises (muscle);
create index if not exists exercises_name_idx on exercises (name);

create table if not exists exercise_favorites (
  user_id text not null,
  exercise_id text not null references exercises(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, exercise_id)
);

create table if not exists routines (
  id text primary key,
  user_id text not null,
  name text not null,
  description text,
  icon text,
  color text,
  is_public boolean not null default false,
  is_archived boolean not null default false,
  is_template boolean not null default false,
  share_slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists routines_user_id_idx on routines (user_id);

create table if not exists routine_exercises (
  id text primary key,
  routine_id text not null references routines(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  sort_order integer not null default 0,
  target_sets integer not null default 3,
  target_reps text default '8-12',
  rest_seconds integer not null default 90
);

create index if not exists routine_exercises_routine_idx on routine_exercises (routine_id);

create table if not exists workouts (
  id text primary key,
  user_id text not null,
  routine_id text references routines(id) on delete set null,
  title text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  notes text,
  photo_data text,
  status text not null default 'in_progress'
);

create index if not exists workouts_user_id_idx on workouts (user_id);
create index if not exists workouts_started_idx on workouts (user_id, started_at desc);

create table if not exists workout_sets (
  id text primary key,
  workout_id text not null references workouts(id) on delete cascade,
  exercise_id text not null references exercises(id) on delete cascade,
  set_order integer not null,
  reps integer not null default 0,
  weight double precision not null default 0,
  rpe integer,
  completed boolean not null default false,
  notes text
);

create index if not exists workout_sets_workout_idx on workout_sets (workout_id);

create table if not exists personal_records (
  id text primary key,
  user_id text not null,
  exercise_id text not null references exercises(id) on delete cascade,
  one_rep_max double precision not null,
  weight double precision not null,
  reps integer not null,
  recorded_at timestamptz not null default now()
);

create index if not exists prs_user_ex_idx on personal_records (user_id, exercise_id, recorded_at desc);

create table if not exists achievements (
  id text primary key,
  user_id text not null,
  key text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, key)
);

create table if not exists weekly_plan (
  id text primary key,
  user_id text not null,
  weekday integer not null,
  routine_id text references routines(id) on delete set null,
  unique (user_id, weekday)
);

create table if not exists body_logs (
  id text primary key,
  user_id text not null,
  logged_at date not null,
  weight_kg double precision,
  chest_cm double precision,
  waist_cm double precision,
  arm_cm double precision,
  thigh_cm double precision,
  notes text
);

create index if not exists body_logs_user_idx on body_logs (user_id, logged_at desc);

create table if not exists progress_photos (
  id text primary key,
  user_id text not null,
  taken_at date not null,
  image_data text not null,
  caption text
);

create table if not exists follows (
  follower_id text not null,
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id)
);

create table if not exists activity_feed (
  id text primary key,
  user_id text not null,
  kind text not null,
  title text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists activity_feed_user_idx on activity_feed (user_id, created_at desc);

create table if not exists workout_likes (
  workout_id text not null references workouts(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (workout_id, user_id)
);

create table if not exists workout_comments (
  id text primary key,
  workout_id text not null references workouts(id) on delete cascade,
  user_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
