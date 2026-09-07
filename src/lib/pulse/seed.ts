import type { Sql } from "@/lib/db";
import { nid } from "@/lib/utils";
import { CATALOG, KEY_EXERCISES, TEMPLATE_ROUTINES } from "./catalog";
import { exerciseMeta } from "./exercise-meta";
import { epley1rm } from "./formulas";
import { DEMO_USER_PREFIX, isDemoUserId, isDevSeedEnabled, isDevToolsEnabled, slugKey } from "./seed-flags";

export { DEMO_USER_PREFIX, isDemoUserId, isDevSeedEnabled, isDevToolsEnabled, slugKey };

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

let setKindReady = false;
let pulseV2Ready = false;
let catalogReady = false;
let pulseV3Ready = false;
let pulseV4Ready = false;
let pulseV5Ready = false;
let pulseV6Ready = false;
let pulseV7Ready = false;
let pulseV8Ready = false;
let pulseV9Ready = false;

export async function ensurePulseV5(sql: Sql): Promise<void> {
  if (pulseV5Ready) return;
  await sql.query(`alter table profiles add column if not exists experience_level text`);
  await sql.query(`alter table profiles add column if not exists training_location text`);
  await sql.query(`alter table profiles add column if not exists default_rest_seconds integer not null default 90`);
  await sql.query(`alter table profiles add column if not exists setup_step integer not null default 0`);
  await sql.query(`alter table profiles add column if not exists setup_completed_at timestamptz`);
  await sql.query(`alter table profiles add column if not exists tutorial_completed_at timestamptz`);
  await sql.query(`
    update profiles
    set
      setup_completed_at = coalesce(setup_completed_at, updated_at, now()),
      tutorial_completed_at = coalesce(tutorial_completed_at, updated_at, now()),
      setup_step = 4
    where onboarding_done = true
      and setup_completed_at is null
  `);
  pulseV5Ready = true;
}

export async function ensurePulseV6(sql: Sql): Promise<void> {
  if (pulseV6Ready) return;
  await sql.query(`alter table profiles add column if not exists username text`);
  await sql.query(`alter table profiles add column if not exists bio text`);
  await sql.query(`alter table profiles add column if not exists profile_visibility text not null default 'private'`);
  await sql.query(`alter table profiles add column if not exists default_workout_visibility text not null default 'me'`);
  await sql.query(`alter table profiles add column if not exists share_volume boolean not null default false`);
  await sql.query(`alter table profiles add column if not exists share_prs boolean not null default false`);
  await sql.query(`create unique index if not exists profiles_username_lower_idx on profiles (lower(username))`);
  await sql.query(`
    update profiles
    set profile_visibility = 'public'
    where public_profile = true and username is null
  `);
  await sql.query(`alter table follows add column if not exists status text not null default 'accepted'`);
  await sql.query(`create index if not exists follows_following_status_idx on follows (following_id, status)`);
  await sql.query(`create index if not exists follows_follower_status_idx on follows (follower_id, status)`);
  await sql.query(`alter table activity_feed add column if not exists visibility text not null default 'followers'`);
  await sql.query(`alter table activity_feed add column if not exists deleted_at timestamptz`);
  await sql.query(`alter table activity_feed add column if not exists share_volume boolean not null default false`);
  await sql.query(`alter table activity_feed add column if not exists share_prs boolean not null default false`);
  await sql.query(`alter table activity_feed add column if not exists exercise_count integer`);
  await sql.query(`alter table activity_feed add column if not exists set_count integer`);
  await sql.query(`alter table activity_feed add column if not exists muscles text`);
  await sql.query(`alter table activity_feed add column if not exists pr_label text`);
  await sql.query(`
    create index if not exists activity_feed_live_idx on activity_feed (created_at desc, id desc) where deleted_at is null
  `);
  await sql.query(`
    create index if not exists activity_feed_author_live_idx on activity_feed (user_id, created_at desc) where deleted_at is null
  `);
  await sql.query(`
    create table if not exists user_blocks (
      blocker_id text not null,
      blocked_id text not null,
      created_at timestamptz not null default now(),
      primary key (blocker_id, blocked_id),
      check (blocker_id <> blocked_id)
    )
  `);
  await sql.query(`
    create table if not exists reports (
      id text primary key,
      reporter_id text not null,
      target_type text not null,
      target_id text not null,
      reason text not null,
      status text not null default 'pending',
      created_at timestamptz not null default now(),
      unique (reporter_id, target_type, target_id)
    )
  `);
  await sql.query(`
    create table if not exists hidden_posts (
      user_id text not null,
      post_id text not null references activity_feed(id) on delete cascade,
      created_at timestamptz not null default now(),
      primary key (user_id, post_id)
    )
  `);
  await sql.query(`create index if not exists reports_status_idx on reports (status, created_at desc)`);
  await sql.query(`create index if not exists reports_reporter_idx on reports (reporter_id)`);
  await sql.query(`create index if not exists user_blocks_blocked_idx on user_blocks (blocked_id)`);
  await sql.query(`create index if not exists hidden_posts_post_idx on hidden_posts (post_id)`);
  pulseV6Ready = true;
}

export async function ensurePulseV7(sql: Sql): Promise<void> {
  if (pulseV7Ready) return;
  await ensurePulseV6(sql);
  await sql.query(`alter table activity_feed add column if not exists routine_id text`);
  await sql.query(`alter table feed_comments add column if not exists updated_at timestamptz`);
  await sql.query(`alter table feed_comments add column if not exists deleted_at timestamptz`);
  await sql.query(`
    create index if not exists feed_comments_live_idx
      on feed_comments (feed_id, created_at)
      where deleted_at is null
  `);
  await sql.query(`
    create index if not exists activity_feed_public_live_idx
      on activity_feed (created_at desc, id desc)
      where deleted_at is null and visibility = 'public'
  `);
  await sql.query(`alter table routines add column if not exists visibility text not null default 'me'`);
  await sql.query(`alter table routines add column if not exists copied_from_id text`);
  await sql.query(`alter table routines add column if not exists copied_from_user_id text`);
  await sql.query(`
    update routines
    set visibility = 'public'
    where is_public = true and visibility = 'me'
  `);
  await sql.query(`create index if not exists routines_visibility_idx on routines (visibility) where visibility <> 'me'`);
  await sql.query(`create index if not exists routines_copied_from_idx on routines (copied_from_id)`);
  pulseV7Ready = true;
}

export async function ensurePulseV8(sql: Sql): Promise<void> {
  if (pulseV8Ready) return;
  await ensurePulseV7(sql);
  await sql.query(`alter table profiles add column if not exists compare_enabled boolean not null default false`);
  await sql.query(`alter table profiles add column if not exists compare_workouts boolean not null default false`);
  await sql.query(`alter table profiles add column if not exists compare_days boolean not null default false`);
  await sql.query(`alter table profiles add column if not exists compare_streak boolean not null default false`);
  await sql.query(`alter table profiles add column if not exists compare_sets boolean not null default false`);
  await sql.query(`alter table profiles add column if not exists compare_volume boolean not null default false`);
  await sql.query(`alter table profiles add column if not exists compare_exercises boolean not null default false`);
  await sql.query(`alter table profiles add column if not exists compare_prs boolean not null default false`);
  pulseV8Ready = true;
}

export async function ensurePulseV9(sql: Sql): Promise<void> {
  if (pulseV9Ready) return;
  await ensurePulseV8(sql);
  await sql.query(`alter table activity_feed add column if not exists caption text`);
  await sql.query(`alter table activity_feed add column if not exists photos text`);
  await sql.query(`alter table activity_feed add column if not exists exercises_json text`);
  await sql.query(`
    create table if not exists notifications (
      id text primary key,
      user_id text not null,
      actor_id text not null,
      type text not null,
      post_id text,
      workout_title text,
      comment_preview text,
      read_at timestamptz,
      created_at timestamptz not null default now()
    )
  `);
  await sql.query(`create index if not exists notifications_user_created_idx on notifications (user_id, created_at desc)`);
  await sql.query(`
    create index if not exists notifications_unread_idx
      on notifications (user_id, created_at desc)
      where read_at is null
  `);
  await sql.query(`create index if not exists notifications_actor_type_post_idx on notifications (actor_id, type, post_id)`);
  pulseV9Ready = true;
}

export async function ensurePulseV4(sql: Sql): Promise<void> {
  if (pulseV4Ready) return;
  await sql.query(`alter table profiles add column if not exists show_rpe boolean not null default true`);
  await sql.query(`alter table personal_records add column if not exists kind text not null default 'one_rm'`);
  await sql.query(`alter table personal_records add column if not exists volume double precision`);
  await sql.query(`
    create table if not exists workout_block_notes (
      workout_id text not null references workouts(id) on delete cascade,
      exercise_id text not null references exercises(id) on delete cascade,
      notes text,
      primary key (workout_id, exercise_id)
    )`);
  await sql.query(
    `create index if not exists personal_records_user_ex_kind_idx on personal_records (user_id, exercise_id, kind)`,
  );
  pulseV4Ready = true;
}

export async function ensurePulseV3(sql: Sql): Promise<void> {
  if (pulseV3Ready) return;
  await sql.query(`alter table profiles add column if not exists healthkit_notify boolean not null default false`);
  await sql.query(`alter table workouts add column if not exists source text not null default 'manual'`);
  await sql.query(`alter table workouts add column if not exists external_id text`);
  await sql.query(`alter table workouts add column if not exists imported_at timestamptz`);
  await sql.query(`alter table body_logs add column if not exists source text not null default 'manual'`);
  await sql.query(`alter table body_logs add column if not exists external_id text`);
  await sql.query(`alter table body_logs add column if not exists imported_at timestamptz`);
  pulseV3Ready = true;
}

export async function ensureSetKind(sql: Sql): Promise<void> {
  if (setKindReady) return;
  await sql.query(`alter table workout_sets add column if not exists set_kind text not null default 'work'`);
  setKindReady = true;
}

export async function ensurePulseV2(sql: Sql): Promise<void> {
  if (pulseV2Ready) return;
  await sql.query(`alter table exercises add column if not exists video_url text`);
  await sql.query(`alter table exercises add column if not exists instructions text`);
  await sql.query(`alter table exercises add column if not exists common_mistakes text`);
  await sql.query(`alter table exercises add column if not exists secondary_muscles text`);
  await sql.query(`alter table profiles add column if not exists auto_rest boolean not null default true`);
  await sql.query(`alter table activity_feed add column if not exists workout_id text`);
  await sql.query(`alter table activity_feed add column if not exists volume double precision`);
  await sql.query(`alter table activity_feed add column if not exists duration_seconds integer`);
  await sql.query(`
    create table if not exists feed_likes (
      feed_id text not null references activity_feed(id) on delete cascade,
      user_id text not null,
      created_at timestamptz not null default now(),
      primary key (feed_id, user_id)
    )`);
  await sql.query(`
    create table if not exists feed_comments (
      id text primary key,
      feed_id text not null references activity_feed(id) on delete cascade,
      user_id text not null,
      body text not null,
      created_at timestamptz not null default now()
    )`);
  await sql.query(`create index if not exists feed_likes_user_idx on feed_likes (user_id)`);
  await sql.query(`create index if not exists feed_comments_feed_idx on feed_comments (feed_id, created_at)`);
  await sql.query(`create index if not exists feed_comments_user_idx on feed_comments (user_id)`);
  await sql.query(`create index if not exists activity_feed_created_idx on activity_feed (created_at desc)`);
  pulseV2Ready = true;
}

export async function ensureCatalog(sql: Sql): Promise<void> {
  if (catalogReady) return;
  await ensureSetKind(sql);
  await ensurePulseV2(sql);
  await ensurePulseV3(sql);
  await ensurePulseV4(sql);
  await ensurePulseV5(sql);
  await ensurePulseV6(sql);
  await ensurePulseV7(sql);
  await ensurePulseV8(sql);
  await ensurePulseV9(sql);
  const rows = await sql<{ n: number }>`select count(*)::int as n from exercises where user_id is null`;
  if ((rows[0]?.n ?? 0) === 0) {
    for (const chunk of chunks(CATALOG, 40)) {
      const placeholders = chunk
        .map((_, i) => {
          const o = i * 5;
          return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},false)`;
        })
        .join(",");
      const params = chunk.flatMap((e) => [e.id, e.name, e.muscle, e.type, e.equipment]);
      await sql.query(
        `insert into exercises (id, name, muscle, type, equipment, is_custom) values ${placeholders} on conflict (id) do nothing`,
        params,
      );
    }
  }
  const pending = await sql<{ id: string; name: string; muscle: string; type: string }>`
    select id, name, muscle, type from exercises where instructions is null limit 80
  `;
  for (const e of pending) {
    const meta = exerciseMeta(e.id, e.name, e.muscle, e.type);
    await sql`
      update exercises
      set instructions = ${meta.instructions},
          common_mistakes = ${meta.mistakes},
          secondary_muscles = ${meta.secondary.join(",")}
      where id = ${e.id}
    `;
  }
  if (pending.length === 0 && (rows[0]?.n ?? 0) > 0) catalogReady = true;
}

/**
 * Insert library templates as THIS user's routines.
 * Production never calls this on signup. Local-only via PULSE_SEED_DEMO=1.
 */
export async function seedTemplates(sql: Sql, userId: string): Promise<void> {
  const existing = await sql<{ n: number }>`select count(*)::int as n from routines where user_id = ${userId}`;
  if ((existing[0]?.n ?? 0) > 0) return;

  for (const tpl of TEMPLATE_ROUTINES) {
    const id = nid();
    await sql`
      insert into routines (id, user_id, name, description, icon, color, is_template)
      values (${id}, ${userId}, ${tpl.name}, ${tpl.description}, ${tpl.icon}, ${tpl.color}, true)
    `;
    if (tpl.exercises.length === 0) continue;
    const placeholders = tpl.exercises
      .map((_, i) => {
        const o = i * 7;
        return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7})`;
      })
      .join(",");
    const params = tpl.exercises.flatMap((ex, order) => [
      nid(),
      id,
      ex.id,
      order,
      ex.sets,
      ex.reps,
      ex.rest,
    ]);
    await sql.query(
      `insert into routine_exercises (id, routine_id, exercise_id, sort_order, target_sets, target_reps, rest_seconds) values ${placeholders}`,
      params,
    );
  }
}

export async function seedWeeklyPlan(sql: Sql, userId: string): Promise<void> {
  const existing = await sql<{ n: number }>`
    select count(*)::int as n from weekly_plan where user_id = ${userId}
  `;
  if ((existing[0]?.n ?? 0) > 0) return;
  const routines = await sql<{ id: string; name: string }>`
    select id, name from routines where user_id = ${userId} order by created_at
  `;
  if (routines.length === 0) return;
  const pick = (name: string) => routines.find((r) => r.name === name) ?? routines[0]!;
  const days: [number, string][] = [
    [0, "Push"],
    [2, "Pull"],
    [4, "Legs"],
  ];
  for (const [weekday, name] of days) {
    const r = pick(name);
    await sql`
      insert into weekly_plan (id, user_id, weekday, routine_id)
      values (${nid()}, ${userId}, ${weekday}, ${r.id})
      on conflict (user_id, weekday) do nothing
    `;
  }
}

export async function cloneLibraryTemplate(
  sql: Sql,
  userId: string,
  key: string,
): Promise<{ id: string; name: string }> {
  const tpl = TEMPLATE_ROUTINES.find((t) => slugKey(t.name) === key);
  if (!tpl) throw new Error("Plantilla no encontrada");
  const id = nid();
  await sql`
    insert into routines (id, user_id, name, description, icon, color, is_template)
    values (${id}, ${userId}, ${tpl.name}, ${tpl.description}, ${tpl.icon}, ${tpl.color}, false)
  `;
  if (tpl.exercises.length > 0) {
    const placeholders = tpl.exercises
      .map((_, i) => {
        const o = i * 7;
        return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7})`;
      })
      .join(",");
    const params = tpl.exercises.flatMap((ex, order) => [
      nid(),
      id,
      ex.id,
      order,
      ex.sets,
      ex.reps,
      ex.rest,
    ]);
    await sql.query(
      `insert into routine_exercises (id, routine_id, exercise_id, sort_order, target_sets, target_reps, rest_seconds) values ${placeholders}`,
      params,
    );
  }
  return { id, name: tpl.name };
}

export function listLibraryTemplates() {
  return TEMPLATE_ROUTINES.map((t) => ({
    key: slugKey(t.name),
    name: t.name,
    description: t.description,
    icon: t.icon,
    color: t.color,
    exerciseCount: t.exercises.length,
  }));
}

export async function seedDevDemoData(sql: Sql, userId: string): Promise<void> {
  if (!isDevSeedEnabled()) return;
  await seedTemplates(sql, userId);
  await seedWeeklyPlan(sql, userId);
  await seedDemoHistory(sql, userId);
  await seedSocialWorld(sql, userId);
}

/** Deletes THIS user's training history. Never runs unless the caller gated it. */
export async function purgeUserSeededTraining(sql: Sql, userId: string): Promise<void> {
  await sql`delete from feed_likes where user_id = ${userId} or feed_id in (select id from activity_feed where user_id = ${userId})`;
  await sql`delete from feed_comments where user_id = ${userId} or feed_id in (select id from activity_feed where user_id = ${userId})`;
  await sql`delete from activity_feed where user_id = ${userId}`;
  await sql`delete from follows where follower_id = ${userId} and following_id like ${DEMO_USER_PREFIX + "%"}`;
  await sql`delete from personal_records where user_id = ${userId}`;
  await sql`delete from achievements where user_id = ${userId}`;
  await sql`delete from body_logs where user_id = ${userId}`;
  await sql`delete from workout_sets where workout_id in (select id from workouts where user_id = ${userId})`;
  await sql`delete from workouts where user_id = ${userId}`;
  await sql`delete from weekly_plan where user_id = ${userId}`;
  await sql`delete from routine_exercises where routine_id in (select id from routines where user_id = ${userId} and is_template = true)`;
  await sql`delete from routines where user_id = ${userId} and is_template = true`;
}

const DEMO_DAYS = [1, 2, 4, 5, 7, 8, 10, 11, 13, 15, 16, 18];

export async function seedDemoHistory(sql: Sql, userId: string): Promise<void> {
  const existing = await sql<{ n: number }>`
    select count(*)::int as n from workouts where user_id = ${userId} and status = 'completed'
  `;
  if ((existing[0]?.n ?? 0) > 0) return;

  const routines = await sql<{ id: string; name: string }>`
    select id, name from routines where user_id = ${userId} order by created_at
  `;
  if (routines.length === 0) return;

  const now = Date.now();
  let workoutIndex = 0;

  for (const daysAgo of DEMO_DAYS) {
    const routine = routines[workoutIndex % routines.length];
    workoutIndex += 1;
    const started = new Date(now - daysAgo * 86400000);
    started.setHours(18 + (daysAgo % 3), 10 + (daysAgo % 40), 0, 0);
    const duration = 3600 + (daysAgo % 5) * 240;
    const ended = new Date(started.getTime() + duration * 1000);
    const wid = nid();
    await sql`
      insert into workouts (id, user_id, routine_id, title, started_at, ended_at, duration_seconds, status)
      values (${wid}, ${userId}, ${routine.id}, ${routine.name}, ${started.toISOString()}, ${ended.toISOString()}, ${duration}, 'completed')
    `;

    const rex = await sql<{
      exercise_id: string;
      target_sets: number;
      rest_seconds: number;
    }>`
      select exercise_id, target_sets, rest_seconds from routine_exercises
      where routine_id = ${routine.id} order by sort_order
    `;

    let setOrder = 0;
    for (const ex of rex) {
      const base =
        ex.exercise_id === KEY_EXERCISES.bench
          ? 80
          : ex.exercise_id === KEY_EXERCISES.squat
            ? 110
            : ex.exercise_id === KEY_EXERCISES.deadlift
              ? 140
              : ex.exercise_id === KEY_EXERCISES.ohp
                ? 50
                : ex.exercise_id === KEY_EXERCISES.rdl
                  ? 90
                  : 28 + (ex.exercise_id.length % 20);
      const bump = Math.floor((18 - daysAgo) / 4) * 2.5;
      const sets = ex.target_sets || 3;
      for (let i = 0; i < sets; i++) {
        const weight = Math.max(0, base + bump - i * 2.5);
        const reps = 8 - i + (daysAgo % 2);
        await sql`
          insert into workout_sets (id, workout_id, exercise_id, set_order, reps, weight, rpe, completed)
          values (${nid()}, ${wid}, ${ex.exercise_id}, ${setOrder}, ${reps}, ${weight}, ${7 + (i % 3)}, true)
        `;
        setOrder += 1;
      }
    }

    await sql`
      insert into activity_feed (id, user_id, kind, title, detail)
      values (${nid()}, ${userId}, 'workout', ${"Completó " + routine.name}, ${duration + "s"})
    `;
  }

  const lifts: { id: string; w: number; r: number }[] = [
    { id: KEY_EXERCISES.bench, w: 90, r: 5 },
    { id: KEY_EXERCISES.squat, w: 125, r: 5 },
    { id: KEY_EXERCISES.deadlift, w: 155, r: 3 },
  ];
  for (const lift of lifts) {
    await sql`
      insert into personal_records (id, user_id, exercise_id, one_rep_max, weight, reps)
      values (${nid()}, ${userId}, ${lift.id}, ${epley1rm(lift.w, lift.r)}, ${lift.w}, ${lift.r})
    `;
  }

  const keys = ["first_workout", "sets_100", "workouts_10", "pr_bench", "pr_squat", "volume_10t"];
  for (const key of keys) {
    await sql`
      insert into achievements (id, user_id, key) values (${nid()}, ${userId}, ${key})
      on conflict (user_id, key) do nothing
    `;
  }

  for (let i = 0; i < 8; i++) {
    const d = new Date(now - i * 7 * 86400000);
    await sql`
      insert into body_logs (id, user_id, logged_at, weight_kg, chest_cm, waist_cm, arm_cm, thigh_cm)
      values (
        ${nid()},
        ${userId},
        ${d.toISOString().slice(0, 10)},
        ${81.4 - i * 0.25},
        ${102 - i * 0.1},
        ${86 - i * 0.2},
        ${36.5 + i * 0.05},
        ${58 + i * 0.04}
      )
    `;
  }
}

const DEMO_ATHLETES = [
  { id: "pulse-demo-sofia", name: "Sofía Martín", goal: "gain" },
  { id: "pulse-demo-marco", name: "Marco Alves", goal: "lose" },
  { id: "pulse-demo-aisha", name: "Aisha Rahman", goal: "maintain" },
] as const;

export async function seedSocialWorld(sql: Sql, userId: string): Promise<void> {
  for (const a of DEMO_ATHLETES) {
    await sql`
      insert into profiles (user_id, display_name, goal, public_profile, onboarding_done, weekly_goal)
      values (${a.id}, ${a.name}, ${a.goal}, true, true, 4)
      on conflict (user_id) do nothing
    `;
    const has = await sql<{ n: number }>`select count(*)::int as n from workouts where user_id = ${a.id}`;
    if ((has[0]?.n ?? 0) === 0) {
      const wid = nid();
      const started = new Date(Date.now() - 3600 * 1000 * (8 + a.name.length));
      await sql`
        insert into workouts (id, user_id, title, started_at, ended_at, duration_seconds, status)
        values (${wid}, ${a.id}, ${"Push"}, ${started.toISOString()}, ${new Date(started.getTime() + 3400000).toISOString()}, 3400, 'completed')
      `;
      await sql`
        insert into workout_sets (id, workout_id, exercise_id, set_order, reps, weight, completed)
        values (${nid()}, ${wid}, ${KEY_EXERCISES.bench}, 0, 5, ${80 + a.name.length}, true)
      `;
      await sql`
        insert into activity_feed (id, user_id, kind, title, detail)
        values (${nid()}, ${a.id}, 'pr', ${a.name + " batió un PR en Press de banca"}, ${"1RM estimado"})
      `;
      await sql`
        insert into activity_feed (id, user_id, kind, title, detail)
        values (${nid()}, ${a.id}, 'workout', ${a.name + " completó Push"}, ${"56 series"})
      `;
    }
    await sql`
      insert into follows (follower_id, following_id) values (${userId}, ${a.id})
      on conflict do nothing
    `;
  }
  await ensurePulseV2(sql);
  const posts = await sql<{ id: string; user_id: string }>`select id, user_id from activity_feed where user_id <> ${userId} order by created_at desc limit 8`;
  for (const p of posts) {
    const has = await sql<{ n: number }>`select count(*)::int as n from feed_comments where feed_id = ${p.id}`;
    if ((has[0]?.n ?? 0) > 0) continue;
    const other = DEMO_ATHLETES.find((a) => a.id !== p.user_id) ?? DEMO_ATHLETES[0];
    await sql`
      insert into feed_comments (id, feed_id, user_id, body)
      values (${nid()}, ${p.id}, ${other.id}, ${"Qué sesión. El press se veía sólido."})
    `;
    await sql`
      insert into feed_comments (id, feed_id, user_id, body)
      values (${nid()}, ${p.id}, ${DEMO_ATHLETES[1].id}, ${"Ritmo brutal. A ver el siguiente."})
    `;
    await sql`
      insert into feed_likes (feed_id, user_id) values (${p.id}, ${userId})
      on conflict do nothing
    `;
    await sql`
      insert into feed_likes (feed_id, user_id) values (${p.id}, ${other.id})
      on conflict do nothing
    `;
  }
}
