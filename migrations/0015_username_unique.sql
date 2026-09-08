-- Public @usuario uniqueness. NULL remains allowed for unfinished profiles.
create unique index if not exists profiles_username_lower_idx on profiles (lower(username));
