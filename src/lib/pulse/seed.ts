import type { Sql } from "@/lib/db";
import { nid } from "@/lib/utils";
import { CATALOG, KEY_EXERCISES, TEMPLATE_ROUTINES } from "./catalog";
import { exerciseMeta } from "./exercise-meta";
import { epley1rm } from "./formulas";

function chunks<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

let setKindReady = false;
let pulseV2Ready = false;

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
  await ensureSetKind(sql);
  await ensurePulseV2(sql);
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
}

export async function seedTemplates(sql: Sql, userId: string): Promise<void> {
  const existing = await sql<{ n: number }>`select count(*)::int as n from routines where user_id = ${userId}`;
  if ((existing[0]?.n ?? 0) > 0) return;

  for (const tpl of TEMPLATE_ROUTINES) {
    const id = nid();
    await sql`
      insert into routines (id, user_id, name, description, icon, color, is_template)
      values (${id}, ${userId}, ${tpl.name}, ${tpl.description}, ${tpl.icon}, ${tpl.color}, true)
    `;
    let order = 0;
    for (const ex of tpl.exercises) {
      await sql`
        insert into routine_exercises (id, routine_id, exercise_id, sort_order, target_sets, target_reps, rest_seconds)
        values (${nid()}, ${id}, ${ex.id}, ${order}, ${ex.sets}, ${ex.reps}, ${ex.rest})
      `;
      order += 1;
    }
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
