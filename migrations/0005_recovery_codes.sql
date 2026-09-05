-- Recovery codes for email/password reset when the app has no mail sender.
create table if not exists recovery_codes (
  user_id text primary key,
  code_hash text not null,
  created_at timestamptz not null default now()
);
