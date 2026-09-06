import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { nid, slugify, toIso } from "@/lib/utils";
import { ACHIEVEMENT_DEFS } from "./achievements";
import { KEY_EXERCISES } from "./catalog";
import { computeStreaks, localISO, restWeekdaysFromPlan } from "./consistency";
import { epley1rm, pulseScore } from "./formulas";
import { normalizeMuscle } from "./exercise-meta";
import { ensureCatalog, ensurePulseV2, ensurePulseV3, ensurePulseV4, ensureSetKind, cloneLibraryTemplate as insertLibraryTemplate, isDevToolsEnabled, isDemoUserId, listLibraryTemplates as libraryTemplates, purgeUserSeededTraining, seedDevDemoData } from "./seed";
import { COMPARE_LABEL, compareToLast, computeCurrentPrs } from "./prs";
import type { Profile } from "./types";

type AnyRow = Record<string, any>;

function reqIso(v: unknown): string {
  return toIso(v as string | Date | null | undefined) ?? "";
}

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function numNull(v: unknown) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function bool(v: unknown) {
  return v === true || v === "t" || v === "true";
}
function mapProfile(r: AnyRow): Profile {
  return {
    userId: r.user_id,
    displayName: r.display_name,
    image: r.image,
    sex: r.sex === "female" ? "female" : r.sex === "male" ? "male" : null,
    weightKg: numNull(r.weight_kg),
    heightCm: numNull(r.height_cm),
    birthDate: r.birth_date,
    goal: r.goal === "gain" || r.goal === "lose" || r.goal === "maintain" || r.goal === "strength" ? r.goal : null,
    units: r.units === "imperial" ? "imperial" : "metric",
    theme: r.theme === "light" || r.theme === "system" ? r.theme : "dark",
    restSound: bool(r.rest_sound),
    autoRest: r.auto_rest == null ? true : bool(r.auto_rest),
    publicProfile: bool(r.public_profile),
    onboardingDone: bool(r.onboarding_done),
    weeklyGoal: num(r.weekly_goal) || 4,
    reminderHour: numNull(r.reminder_hour),
    healthkitNotify: bool(r.healthkit_notify),
    showRpe: r.show_rpe == null ? true : bool(r.show_rpe),
  };
}
async function ensureProfile(sql: Sql, userId: string) {
  await ensureCatalog(sql);
  await ensurePulseV2(sql);
  await ensurePulseV3(sql);
  await ensurePulseV4(sql);
  const rows = await sql<AnyRow>`select * from profiles where user_id = ${userId}`;
  if (rows[0]) return mapProfile(rows[0]);
  await sql<AnyRow>`
    insert into profiles (user_id) values (${userId})
    on conflict (user_id) do nothing
  `;
  await seedDevDemoData(sql, userId);
  return mapProfile((await sql<AnyRow>`select * from profiles where user_id = ${userId}`)[0]);
}
function startOfWeek(d: Date = new Date()) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}
async function computeStreak(sql: Sql, userId: string) {
  const rows = await sql<AnyRow>`
    select started_at from workouts
    where user_id = ${userId} and status = 'completed'
    order by started_at desc
    limit 200
  `;
  const plan = await sql<AnyRow>`
    select wp.weekday, wp.routine_id, r.name
    from weekly_plan wp
    left join routines r on r.id = wp.routine_id
    where wp.user_id = ${userId}
  `;
  const trained = new Set(rows.map((r) => localISO(new Date(r.started_at))));
  const { hasPlan, rest } = restWeekdaysFromPlan(plan.map((p) => ({
    weekday: p.weekday,
    routineId: p.routine_id,
    routineName: p.name
  })));
  return computeStreaks(trained, rest, hasPlan, new Date()).current;
}
async function unlock(sql: Sql, userId: string, key: string) {
  await sql<AnyRow>`
    insert into achievements (id, user_id, key) values (${nid()}, ${userId}, ${key})
    on conflict (user_id, key) do nothing
  `;
}
async function evaluateAchievements(sql: Sql, userId: string, extra?: { night?: boolean; prKeys?: string[] }) {
  const t = (await sql<AnyRow>`
    select
      (select count(*)::int from workouts where user_id = ${userId} and status = 'completed') as workouts,
      (select count(*)::int from workout_sets s join workouts w on w.id = s.workout_id where w.user_id = ${userId} and s.completed = true) as sets,
      (select coalesce(sum(s.weight * s.reps),0) from workout_sets s join workouts w on w.id = s.workout_id where w.user_id = ${userId} and s.completed = true) as volume
  `)[0];
  if (t && t.workouts >= 1) await unlock(sql, userId, "first_workout");
  if (t && t.workouts >= 10) await unlock(sql, userId, "workouts_10");
  if (t && t.workouts >= 25) await unlock(sql, userId, "workouts_25");
  if (t && t.sets >= 100) await unlock(sql, userId, "sets_100");
  if (t && num(t.volume) >= 10000) await unlock(sql, userId, "volume_10t");
  if (await computeStreak(sql, userId) >= 7) await unlock(sql, userId, "streak_7");
  if (extra?.night) await unlock(sql, userId, "night_owl");
  for (const k of extra?.prKeys ?? []) await unlock(sql, userId, k);
}
export const getBootstrap = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await getSql();
  const profile = await ensureProfile(sql, context.userId);
  const week = startOfWeek().toISOString();
  const weekStats = await sql<AnyRow>`
      select
        count(distinct w.id)::int as workouts,
        coalesce(sum(case when s.completed then s.weight * s.reps else 0 end),0) as volume,
        coalesce(sum(distinct w.duration_seconds),0) as duration,
        count(s.id) filter (where s.completed)::int as sets
      from workouts w
      left join workout_sets s on s.workout_id = w.id
      where w.user_id = ${context.userId} and w.status = 'completed' and w.started_at >= ${week}
    `;
  const volumeByDay = await sql<AnyRow>`
      select extract(dow from w.started_at)::int as day,
             coalesce(sum(s.weight * s.reps),0) as volume
      from workouts w
      join workout_sets s on s.workout_id = w.id and s.completed = true
      where w.user_id = ${context.userId} and w.status = 'completed' and w.started_at >= ${week}
      group by 1
    `;
  const muscles = await sql<AnyRow>`
      select e.muscle, coalesce(sum(s.weight * s.reps),0) as volume
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and w.status = 'completed' and w.started_at >= ${week} and s.completed = true
      group by e.muscle
      order by volume desc
    `;
  const prs = await sql<AnyRow>`
      select distinct on (pr.exercise_id)
        pr.id, pr.exercise_id, e.name, e.muscle, pr.one_rep_max, pr.weight, pr.reps, pr.recorded_at
      from personal_records pr
      join exercises e on e.id = pr.exercise_id
      where pr.user_id = ${context.userId}
      order by pr.exercise_id, pr.recorded_at desc, pr.one_rep_max desc
    `;
  const streak = await computeStreak(sql, context.userId);
  const ws = weekStats[0];
  const score = pulseScore({
    workoutsThisWeek: ws?.workouts ?? 0,
    weeklyGoal: profile.weeklyGoal,
    volumeThisWeek: num(ws?.volume),
    streakDays: streak
  });
  const planToday = await sql<AnyRow>`
      select wp.routine_id, r.name, r.icon, r.color
      from weekly_plan wp
      left join routines r on r.id = wp.routine_id
      where wp.user_id = ${context.userId} and wp.weekday = ${((new Date()).getDay() + 6) % 7}
    `;
  const lastRoutine = await sql<AnyRow>`
      select r.id, r.name, r.icon, r.color
      from workouts w
      join routines r on r.id = w.routine_id
      where w.user_id = ${context.userId} and w.status = 'completed'
      order by w.started_at desc
      limit 1
    `;
  const active = await sql<AnyRow>`
      select id from workouts where user_id = ${context.userId} and status in ('in_progress','paused')
      order by started_at desc limit 1
    `;
  const lastMuscles = await sql<AnyRow>`
      select e.muscle, max(w.started_at) as last
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and w.status = 'completed'
      group by e.muscle
      order by last asc
    `;
  const suggestion = lastMuscles[0]
    ? `Hace días que ${lastMuscles[0].muscle.toLowerCase()} espera su turno.`
    : null;
  const heatmap = await sql<AnyRow>`
      select started_at::date as d, count(*)::int as n
      from workouts
      where user_id = ${context.userId} and status = 'completed'
        and started_at >= ${(new Date(Date.now() - 29376e5)).toISOString()}
      group by 1
    `;
  const todayId = planToday[0]?.routine_id ?? lastRoutine[0]?.id ?? null;
  const todayMeta = todayId ? await sql<AnyRow>`
          select count(*)::int as n, coalesce(sum(rest_seconds),0)::int as rest
          from routine_exercises where routine_id = ${todayId}
        ` : [];
  const lastOfToday = todayId ? await sql<AnyRow>`
          select started_at, duration_seconds from workouts
          where user_id = ${context.userId} and routine_id = ${todayId} and status = 'completed'
          order by started_at desc limit 1
        ` : [];
  const todayExercises = todayId ? await sql<AnyRow>`
          select e.name
          from routine_exercises re
          join exercises e on e.id = re.exercise_id
          where re.routine_id = ${todayId}
          order by re.sort_order
          limit 6
        ` : [];
  const muscleLoad = await sql<AnyRow>`
      select e.muscle, count(*)::int as sets, coalesce(sum(s.weight * s.reps),0) as volume
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and w.status = 'completed' and s.completed = true
        and w.started_at >= ${week}
      group by e.muscle
    `;
  const secondary = await sql<AnyRow>`
      select e.secondary_muscles, count(*)::int as n
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and w.status = 'completed' and s.completed = true
        and w.started_at >= ${week} and e.secondary_muscles is not null and e.secondary_muscles <> ''
      group by e.secondary_muscles
    `;
  const loadMap = new Map<string, { sets: number; volume: number }>();
  for (const m of muscleLoad) {
    const key = String(normalizeMuscle(m.muscle));
    const cur = loadMap.get(key) ?? {
      sets: 0,
      volume: 0
    };
    loadMap.set(key, {
      sets: cur.sets + num(m.sets),
      volume: cur.volume + num(m.volume)
    });
  }
  for (const row of secondary) for (const name of String(row.secondary_muscles ?? "").split(",").map((s: string) => s.trim()).filter(Boolean)) {
    const key = String(normalizeMuscle(name));
    const cur = loadMap.get(key) ?? {
      sets: 0,
      volume: 0
    };
    loadMap.set(key, {
      sets: cur.sets + row.n * 0.5,
      volume: cur.volume
    });
  }
  const lifetime = await sql<AnyRow>`
      select count(*)::int as n from workouts
      where user_id = ${context.userId} and status = 'completed'
    `;
  return {
    profile,
    lifetimeWorkouts: lifetime[0]?.n ?? 0,
    week: {
      workouts: ws?.workouts ?? 0,
      volume: num(ws?.volume),
      duration: num(ws?.duration),
      sets: ws?.sets ?? 0
    },
    volumeByDay: volumeByDay.map((r) => ({
      day: num(r.day),
      volume: num(r.volume)
    })),
    muscles: muscles.map((m) => ({
      muscle: m.muscle,
      volume: num(m.volume)
    })),
    prs: prs.sort((a, b) => num(b.one_rep_max) - num(a.one_rep_max)).slice(0, 3).map((p) => ({
      id: p.id,
      exerciseId: p.exercise_id,
      name: p.name,
      muscle: p.muscle,
      oneRepMax: num(p.one_rep_max),
      weight: num(p.weight),
      reps: p.reps,
      recordedAt: toIso(p.recorded_at)
    })),
    streak,
    score,
    today: planToday[0] ? {
      routineId: planToday[0].routine_id,
      name: planToday[0].name,
      icon: planToday[0].icon,
      color: planToday[0].color,
      exerciseCount: todayMeta[0]?.n ?? 0,
      lastAt: toIso(lastOfToday[0]?.started_at) ?? null,
      estimatedMinutes: Math.max(20, Math.round((todayMeta[0]?.n ?? 5) * 4 + (todayMeta[0]?.rest ?? 0) / 60)),
      lastDuration: lastOfToday[0]?.duration_seconds ?? null,
      exercises: todayExercises.map((e) => e.name)
    } : lastRoutine[0] ? {
      routineId: lastRoutine[0].id,
      name: lastRoutine[0].name,
      icon: lastRoutine[0].icon,
      color: lastRoutine[0].color,
      exerciseCount: todayMeta[0]?.n ?? 0,
      lastAt: toIso(lastOfToday[0]?.started_at) ?? null,
      estimatedMinutes: Math.max(20, Math.round((todayMeta[0]?.n ?? 5) * 4 + (todayMeta[0]?.rest ?? 0) / 60)),
      lastDuration: lastOfToday[0]?.duration_seconds ?? null,
      exercises: todayExercises.map((e) => e.name)
    } : null,
    activeWorkoutId: active[0]?.id ?? null,
    suggestion,
    heatmap: heatmap.map((h) => ({
      date: String(h.d).slice(0, 10),
      count: h.n
    })),
    muscleLoad: [...loadMap.entries()].map(([muscle, v]) => ({
      muscle,
      sets: v.sets,
      volume: v.volume
    }))
  };
});
export const updateProfile = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: Partial<Profile> & { displayName?: string | null }) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureProfile(sql, context.userId);
  await sql<AnyRow>`
      update profiles set
        display_name = coalesce(${data.displayName ?? null}, display_name),
        sex = coalesce(${data.sex ?? null}, sex),
        weight_kg = coalesce(${data.weightKg ?? null}, weight_kg),
        height_cm = coalesce(${data.heightCm ?? null}, height_cm),
        birth_date = coalesce(${data.birthDate ?? null}, birth_date),
        goal = coalesce(${data.goal ?? null}, goal),
        units = coalesce(${data.units ?? null}, units),
        theme = coalesce(${data.theme ?? null}, theme),
        rest_sound = coalesce(${data.restSound ?? null}, rest_sound),
        auto_rest = coalesce(${data.autoRest ?? null}, auto_rest),
        public_profile = coalesce(${data.publicProfile ?? null}, public_profile),
        weekly_goal = coalesce(${data.weeklyGoal ?? null}, weekly_goal),
        reminder_hour = coalesce(${data.reminderHour ?? null}, reminder_hour),
        healthkit_notify = coalesce(${data.healthkitNotify ?? null}, healthkit_notify),
        show_rpe = coalesce(${data.showRpe ?? null}, show_rpe),
        updated_at = now()
      where user_id = ${context.userId}
    `;
  return mapProfile((await sql<AnyRow>`select * from profiles where user_id = ${context.userId}`)[0]);
});
export const completeOnboarding = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureProfile(sql, context.userId);
  const name = String(data.displayName ?? "").trim() || "Atleta";
  const goal = data.goal === "gain" || data.goal === "lose" || data.goal === "maintain" || data.goal === "strength" ? data.goal : null;
  const units = data.units === "imperial" ? "imperial" : "metric";
  const weekly = Math.min(7, Math.max(1, Number(data.weeklyGoal) || 4));
  await sql<AnyRow>`
      update profiles set
        display_name = ${name},
        goal = ${goal},
        units = ${units},
        weekly_goal = ${weekly},
        onboarding_done = true,
        updated_at = now()
      where user_id = ${context.userId}
    `;
  return { ok: true };
});
export const listExercises = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d: any) => d ?? {}).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureCatalog(sql);
  const q = data.q?.trim().toLowerCase() ?? "";
  return (await sql<AnyRow>`
      select e.id, e.name, e.muscle, e.type, e.equipment, e.gif_url, e.instructions, e.is_custom, e.user_id,
        exists(select 1 from exercise_favorites f where f.user_id = ${context.userId} and f.exercise_id = e.id) as fav
      from exercises e
      where (e.user_id is null or e.user_id = ${context.userId})
      order by e.name
    `).filter((r) => {
    if (q && !r.name.toLowerCase().includes(q)) return false;
    if (data.muscle && r.muscle !== data.muscle) return false;
    if (data.type && r.type !== data.type) return false;
    if (data.equipment && r.equipment !== data.equipment) return false;
    if (data.favorites && !bool(r.fav)) return false;
    return true;
  }).map((r) => ({
    id: r.id,
    name: r.name,
    muscle: r.muscle,
    type: r.type,
    equipment: r.equipment,
    gifUrl: r.gif_url,
    instructions: r.instructions,
    isCustom: bool(r.is_custom),
    userId: r.user_id,
    isFavorite: bool(r.fav)
  }));
});
export const createExercise = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  const id = `usr_${nid()}`;
  await sql<AnyRow>`
      insert into exercises (id, name, muscle, type, equipment, is_custom, user_id)
      values (${id}, ${data.name.trim()}, ${data.muscle}, ${data.type}, ${data.equipment ?? null}, true, ${context.userId})
    `;
  return { id };
});
export const toggleFavorite = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  if (((await sql<AnyRow>`
      select count(*)::int as n from exercise_favorites
      where user_id = ${context.userId} and exercise_id = ${data.exerciseId}
    `)[0]?.n ?? 0) > 0) {
    await sql<AnyRow>`delete from exercise_favorites where user_id = ${context.userId} and exercise_id = ${data.exerciseId}`;
    return { favorite: false };
  }
  await sql<AnyRow>`insert into exercise_favorites (user_id, exercise_id) values (${context.userId}, ${data.exerciseId})`;
  return { favorite: true };
});
export const getExerciseDetail = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  const ex = await sql<AnyRow>`
      select id, name, muscle, type, equipment, gif_url, video_url, instructions, common_mistakes, secondary_muscles, is_custom from exercises
      where id = ${data.id} and (user_id is null or user_id = ${context.userId})
    `;
  if (!ex[0]) return null;
  const history = await sql<AnyRow>`
      select w.id as workout_id, w.started_at,
        max(s.weight) as weight,
        max(s.reps) as reps,
        sum(s.weight * s.reps) as volume
      from workout_sets s
      join workouts w on w.id = s.workout_id
      where w.user_id = ${context.userId} and s.exercise_id = ${data.id} and w.status = 'completed' and s.completed = true
      group by w.id, w.started_at
      order by w.started_at desc
      limit 10
    `;
  const prs = await sql<AnyRow>`
      select one_rep_max, weight, reps, recorded_at, kind, volume from personal_records
      where user_id = ${context.userId} and exercise_id = ${data.id}
      order by recorded_at desc
    `;
  const fav = await sql<AnyRow>`
      select count(*)::int as n from exercise_favorites where user_id = ${context.userId} and exercise_id = ${data.id}
    `;
  return {
    id: ex[0].id,
    name: ex[0].name,
    muscle: ex[0].muscle,
    type: ex[0].type,
    equipment: ex[0].equipment,
    gifUrl: ex[0].gif_url,
    videoUrl: ex[0].video_url,
    instructions: ex[0].instructions,
    commonMistakes: ex[0].common_mistakes,
    secondaryMuscles: String(ex[0].secondary_muscles ?? "").split(",").map((s: string) => s.trim()).filter(Boolean),
    isCustom: bool(ex[0].is_custom),
    isFavorite: (fav[0]?.n ?? 0) > 0,
    history: history.map((h) => ({
      workoutId: String(h.workout_id),
      date: reqIso(h.started_at),
      weight: num(h.weight),
      reps: num(h.reps),
      volume: num(h.volume)
    })),
    prs: prs.map((p) => ({
      kind: String(p.kind ?? "one_rm"),
      oneRepMax: num(p.one_rep_max),
      weight: num(p.weight),
      reps: num(p.reps),
      volume: num(p.volume),
      recordedAt: reqIso(p.recorded_at)
    }))
  };
});
export const listRoutines = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d: any) => d ?? {}).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureProfile(sql, context.userId);
  return (await sql<AnyRow>`
      select r.id, r.name, r.description, r.icon, r.color, r.is_public, r.is_archived, r.is_template, r.share_slug,
        (select count(*)::int from routine_exercises re where re.routine_id = r.id) as n,
        (select max(w.started_at) from workouts w where w.routine_id = r.id and w.user_id = ${context.userId}) as last
      from routines r
      where r.user_id = ${context.userId} and r.is_archived = ${Boolean(data.archived)}
      order by r.created_at
    `).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    icon: r.icon ?? "dumbbell",
    color: r.color ?? "#FF2D55",
    isPublic: bool(r.is_public),
    isArchived: bool(r.is_archived),
    isTemplate: bool(r.is_template),
    shareSlug: r.share_slug,
    lastUsedAt: toIso(r.last),
    exerciseCount: r.n
  }));
});
export const getRoutine = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  const r = await sql<AnyRow>`select * from routines where id = ${data.id} and user_id = ${context.userId}`;
  if (!r[0]) return null;
  const exercises = await sql<AnyRow>`
      select re.id, re.exercise_id, e.name, e.muscle, e.equipment, re.sort_order, re.target_sets, re.target_reps, re.rest_seconds
      from routine_exercises re
      join exercises e on e.id = re.exercise_id
      where re.routine_id = ${data.id}
      order by re.sort_order
    `;
  return {
    id: r[0].id,
    name: r[0].name,
    description: r[0].description,
    icon: r[0].icon ?? "dumbbell",
    color: r[0].color ?? "#FF2D55",
    isPublic: bool(r[0].is_public),
    isArchived: bool(r[0].is_archived),
    isTemplate: bool(r[0].is_template),
    shareSlug: r[0].share_slug,
    lastUsedAt: null,
    exerciseCount: exercises.length,
    exercises: exercises.map((e) => ({
      id: e.id,
      exerciseId: e.exercise_id,
      name: e.name,
      muscle: e.muscle,
      equipment: e.equipment,
      sortOrder: e.sort_order,
      targetSets: e.target_sets,
      targetReps: e.target_reps ?? "8-12",
      restSeconds: e.rest_seconds
    }))
  };
});
export const saveRoutine = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  const id = data.id ?? nid();
  if (data.id) {
    if (!(await sql<AnyRow>`select count(*)::int as n from routines where id = ${id} and user_id = ${context.userId}`)[0]?.n) throw new Error("Rutina no encontrada");
    await sql<AnyRow>`
        update routines set name = ${data.name}, description = ${data.description ?? null},
          icon = ${data.icon ?? "dumbbell"}, color = ${data.color ?? "#FF2D55"}, updated_at = now()
        where id = ${id} and user_id = ${context.userId}
      `;
    await sql<AnyRow>`delete from routine_exercises where routine_id = ${id}`;
  } else await sql<AnyRow>`
        insert into routines (id, user_id, name, description, icon, color)
        values (${id}, ${context.userId}, ${data.name}, ${data.description ?? null}, ${data.icon ?? "dumbbell"}, ${data.color ?? "#FF2D55"})
      `;
  let order = 0;
  for (const ex of data.exercises) {
    await sql<AnyRow>`
        insert into routine_exercises (id, routine_id, exercise_id, sort_order, target_sets, target_reps, rest_seconds)
        values (${nid()}, ${id}, ${ex.exerciseId}, ${order}, ${ex.targetSets}, ${ex.targetReps}, ${ex.restSeconds})
      `;
    order += 1;
  }
  return { id };
});
export const archiveRoutine = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  await (await getSql())`update routines set is_archived = ${data.archived} where id = ${data.id} and user_id = ${context.userId}`;
  return { ok: true };
});
export const duplicateRoutine = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  const src = await sql<AnyRow>`
      select name, description, icon, color from routines where id = ${data.id} and user_id = ${context.userId}
    `;
  if (!src[0]) throw new Error("Rutina no encontrada");
  const id = nid();
  await sql<AnyRow>`
      insert into routines (id, user_id, name, description, icon, color)
      values (${id}, ${context.userId}, ${src[0].name + " (copia)"}, ${src[0].description}, ${src[0].icon}, ${src[0].color})
    `;
  const ex = await sql<AnyRow>`
      select exercise_id, sort_order, target_sets, target_reps, rest_seconds from routine_exercises where routine_id = ${data.id}
    `;
  for (const e of ex) await sql<AnyRow>`
        insert into routine_exercises (id, routine_id, exercise_id, sort_order, target_sets, target_reps, rest_seconds)
        values (${nid()}, ${id}, ${e.exercise_id}, ${e.sort_order}, ${e.target_sets}, ${e.target_reps}, ${e.rest_seconds})
      `;
  return { id };
});
export const shareRoutine = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await sql<AnyRow>`
      update routines set is_public = true, share_slug = coalesce(share_slug, ${slugify(data.id).slice(0, 8) + nid().slice(0, 8)})
      where id = ${data.id} and user_id = ${context.userId}
    `;
  return { slug: (await sql<AnyRow>`select share_slug from routines where id = ${data.id} and user_id = ${context.userId}`)[0]?.share_slug };
});
export const getPublicRoutine = createServerFn({ method: "GET" }).validator((d: any) => d).handler(async ({ data }) => {
  const sql = await getSql();
  const r = await sql<AnyRow>`
      select r.id, r.name, r.description, r.icon, r.color, p.display_name
      from routines r
      left join profiles p on p.user_id = r.user_id
      where r.share_slug = ${data.slug} and r.is_public = true
    `;
  if (!r[0]) return null;
  const exercises = await sql<AnyRow>`
      select e.name, e.muscle, re.target_sets, re.target_reps
      from routine_exercises re join exercises e on e.id = re.exercise_id
      where re.routine_id = ${r[0].id} order by re.sort_order
    `;
  return {
    name: r[0].name,
    description: r[0].description,
    icon: r[0].icon,
    color: r[0].color,
    author: r[0].display_name ?? "Atleta Pulse",
    exercises
  };
});
function mapKind(v: unknown): "work" | "warmup" | "drop" | "fail" {
  if (v === "warmup" || v === "drop" || v === "fail") return v;
  return "work";
}
async function lastSessionFor(sql: Sql, userId: string, exerciseId: string, excludeWorkoutId?: string | null) {
  const last = await sql<AnyRow>`
    select w.id as workout_id, w.started_at from workouts w
    join workout_sets s on s.workout_id = w.id
    where w.user_id = ${userId} and w.status = 'completed' and s.exercise_id = ${exerciseId}
      and (${excludeWorkoutId ?? null}::text is null or w.id <> ${excludeWorkoutId ?? null})
    order by w.started_at desc limit 1
  `;
  if (!last[0]) {
    return { sets: [] as AnyRow[], startedAt: null as string | null, volume: 0, setCount: 0, bestWeight: 0, bestReps: 0 };
  }
  const sets = await sql<AnyRow>`
    select id, exercise_id, set_order, reps, weight, rpe, completed, notes, set_kind
    from workout_sets where workout_id = ${last[0].workout_id} and exercise_id = ${exerciseId}
    order by set_order
  `;
  const work = sets.filter((s) => mapKind(s.set_kind) !== "warmup" && bool(s.completed));
  const volume = work.reduce((sum, s) => sum + num(s.weight) * num(s.reps), 0);
  let bestWeight = 0;
  let bestReps = 0;
  for (const s of work) {
    const w = num(s.weight);
    const r = num(s.reps);
    if (w > bestWeight + 1e-9 || (Math.abs(w - bestWeight) < 1e-9 && r > bestReps)) {
      bestWeight = w;
      bestReps = r;
    }
  }
  if (bestWeight === 0 && bestReps === 0 && work[0]) {
    bestReps = num(work[0].reps);
  }
  return {
    sets,
    startedAt: toIso(last[0].started_at),
    volume,
    setCount: work.length,
    bestWeight,
    bestReps,
  };
}
async function lastSetsFor(sql: Sql, userId: string, exerciseId: string, excludeWorkoutId?: string | null) {
  return (await lastSessionFor(sql, userId, exerciseId, excludeWorkoutId)).sets;
}
async function recomputePrs(sql: Sql, userId: string) {
  await ensurePulseV4(sql);
  const rows = await sql<AnyRow>`
    select s.exercise_id, s.weight, s.reps, s.set_kind, s.workout_id, w.started_at
    from workout_sets s
    join workouts w on w.id = s.workout_id
    where w.user_id = ${userId} and w.status = 'completed' and s.completed = true
  `;
  const prs = computeCurrentPrs(
    rows.map((r) => ({
      exerciseId: String(r.exercise_id),
      weight: num(r.weight),
      reps: num(r.reps),
      kind: r.set_kind ? String(r.set_kind) : "work",
      workoutId: String(r.workout_id),
      startedAt: reqIso(r.started_at),
    })),
  );
  await sql<AnyRow>`delete from personal_records where user_id = ${userId}`;
  for (const p of prs) {
    await sql<AnyRow>`
      insert into personal_records (id, user_id, exercise_id, one_rep_max, weight, reps, kind, volume, recorded_at)
      values (${nid()}, ${userId}, ${p.exerciseId}, ${p.oneRepMax}, ${p.weight}, ${p.reps}, ${p.kind}, ${p.volume}, ${p.recordedAt})
    `;
  }
  return prs;
}
export const startWorkout = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureProfile(sql, context.userId);
  const open = await sql<AnyRow>`
      select id from workouts where user_id = ${context.userId} and status in ('in_progress','paused')
      order by started_at desc limit 1
    `;
  if (open[0]) return {
    id: open[0].id,
    resumed: true
  };
  let title = "Entrenamiento libre";
  let items: { exerciseId: string; sets: number; reps: string; rest: number }[] = [];
  if (data.routineId) {
    title = (await sql<AnyRow>`select name from routines where id = ${data.routineId} and user_id = ${context.userId}`)[0]?.name ?? title;
    items = (await sql<AnyRow>`
        select exercise_id, target_sets, target_reps, rest_seconds from routine_exercises
        where routine_id = ${data.routineId} order by sort_order
      `).map((e) => ({
      exerciseId: String(e.exercise_id),
      sets: num(e.target_sets),
      reps: e.target_reps ?? "8-12",
      rest: num(e.rest_seconds)
    }));
  } else items = (data.exerciseIds ?? []).map((id: string) => ({
    exerciseId: id,
    sets: 3,
    reps: "8-12",
    rest: 90
  }));
  const id = nid();
  await sql<AnyRow>`
      insert into workouts (id, user_id, routine_id, title, status, source)
      values (${id}, ${context.userId}, ${data.routineId ?? null}, ${title}, 'in_progress', ${"manual"})
    `;
  let order = 0;
  for (const item of items) {
    const prev = await lastSetsFor(sql, context.userId, item.exerciseId);
    const count = Math.max(item.sets, 1);
    for (let i = 0; i < count; i++) {
      const p = prev[i];
      await sql<AnyRow>`
          insert into workout_sets (id, workout_id, exercise_id, set_order, reps, weight, rpe, completed, set_kind)
          values (${nid()}, ${id}, ${item.exerciseId}, ${order}, ${p ? p.reps : 8}, ${p ? num(p.weight) : 0}, null, false, ${p ? mapKind(p.set_kind) : "work"})
        `;
      order += 1;
    }
  }
  return {
    id,
    resumed: false
  };
});
export const getWorkout = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureSetKind(sql);
  await ensurePulseV2(sql);
  await ensurePulseV4(sql);
  const w = await sql<AnyRow>`select * from workouts where id = ${data.id} and user_id = ${context.userId}`;
  if (!w[0]) return null;
  const sets = await sql<AnyRow>`
      select s.id, s.exercise_id, e.name, e.muscle, e.equipment, e.gif_url, e.type, e.instructions, s.set_order, s.reps, s.weight, s.rpe, s.completed, s.notes, s.set_kind
      from workout_sets s join exercises e on e.id = s.exercise_id
      where s.workout_id = ${data.id}
      order by s.set_order
    `;
  const grouped = new Map<string, AnyRow[]>();
  for (const s of sets) {
    const arr = grouped.get(s.exercise_id) ?? [];
    arr.push(s);
    grouped.set(String(s.exercise_id), arr);
  }
  const restRows = w[0].routine_id ? await sql<AnyRow>`
          select re.exercise_id, re.rest_seconds from routine_exercises re
          where re.routine_id = ${w[0].routine_id}
        ` : [];
  const restMap = new Map(restRows.map((r) => [String(r.exercise_id), num(r.rest_seconds)]));
  const noteRows = await sql<AnyRow>`
      select exercise_id, notes from workout_block_notes where workout_id = ${data.id}
    `;
  const noteMap = new Map(noteRows.map((r) => [String(r.exercise_id), r.notes ? String(r.notes) : ""]));
  const prRows = await sql<AnyRow>`
      select exercise_id, kind, one_rep_max, weight, reps, volume, recorded_at
      from personal_records where user_id = ${context.userId}
    `;
  const prByEx = new Map<string, AnyRow[]>();
  for (const p of prRows) {
    const k = String(p.exercise_id);
    const arr = prByEx.get(k) ?? [];
    arr.push(p);
    prByEx.set(k, arr);
  }
  const workoutDay = reqIso(w[0].started_at).slice(0, 10);
  const blocks = [];
  const muscles: string[] = [];
  for (const [exerciseId, arr] of grouped) {
    const head = arr[0];
    const done = arr.filter((s: AnyRow) => bool(s.completed) && mapKind(s.set_kind) !== "warmup");
    const best = done.reduce((m: number, s: AnyRow) => Math.max(m, epley1rm(num(s.weight), num(s.reps))), 0);
    const exVol = done.reduce((m: number, s: AnyRow) => m + num(s.weight) * num(s.reps), 0);
    let bestW = 0;
    let bestR = 0;
    for (const s of done) {
      if (num(s.weight) > bestW || (num(s.weight) === bestW && num(s.reps) > bestR)) {
        bestW = num(s.weight);
        bestR = num(s.reps);
      }
    }
    const prs = prByEx.get(exerciseId) ?? [];
    const oneRm = prs.find((p) => p.kind === "one_rm") ?? prs[0];
    const last = await lastSessionFor(sql, context.userId, exerciseId, String(w[0].id));
    const lastBest = { weight: last.bestWeight, reps: last.bestReps, volume: last.volume };
    const cmp = compareToLast({ weight: bestW, reps: bestR, volume: exVol }, last.setCount > 0 ? lastBest : null);
    const muscle = String(normalizeMuscle(head.muscle));
    if (!muscles.includes(muscle)) muscles.push(muscle);
    const mapSet = (s: AnyRow) => {
      const kind = mapKind(s.set_kind);
      const isPr =
        kind !== "warmup" &&
        bool(s.completed) &&
        prs.some((p) => {
          const day = reqIso(p.recorded_at).slice(0, 10);
          if (day !== workoutDay) return false;
          if (p.kind === "max_weight" && Math.abs(num(s.weight) - num(p.weight)) < 0.06 && num(s.reps) === num(p.reps)) return true;
          if (p.kind === "max_reps" && num(s.reps) === num(p.reps) && Math.abs(num(s.weight) - num(p.weight)) < 0.06) return true;
          if (p.kind === "one_rm" && Math.abs(epley1rm(num(s.weight), num(s.reps)) - num(p.one_rep_max)) < 0.51) return true;
          return false;
        });
      return {
        id: String(s.id),
        exerciseId: String(s.exercise_id),
        setOrder: num(s.set_order),
        reps: num(s.reps),
        weight: num(s.weight),
        rpe: numNull(s.rpe),
        completed: bool(s.completed),
        notes: s.notes ?? null,
        kind,
        isPr,
      };
    };
    blocks.push({
      exerciseId,
      name: head.name,
      muscle: head.muscle,
      equipment: head.equipment,
      gifUrl: head.gif_url,
      type: head.type,
      instructions: head.instructions,
      notes: noteMap.get(exerciseId) || null,
      restSeconds: restMap.get(exerciseId) ?? 90,
      targetSets: arr.length,
      targetReps: "8-12",
      estimated1rm: best || null,
      pr: oneRm ? num(oneRm.one_rep_max) : null,
      prs: prs.map((p) => ({
        kind: String(p.kind ?? "one_rm"),
        weight: num(p.weight),
        reps: num(p.reps),
        oneRepMax: num(p.one_rep_max),
        volume: num(p.volume),
        recordedAt: reqIso(p.recorded_at),
      })),
      volume: exVol,
      lastSession: last.startedAt
        ? {
            startedAt: last.startedAt,
            setCount: last.setCount,
            volume: last.volume,
            bestWeight: last.bestWeight,
            bestReps: last.bestReps,
          }
        : null,
      compare: cmp,
      compareLabel: cmp ? COMPARE_LABEL[cmp] : null,
      lastSets: last.sets.map(mapSet),
      sets: arr.map(mapSet),
    });
  }
  const volume = sets.reduce((sum, s) => sum + (bool(s.completed) ? num(s.weight) * num(s.reps) : 0), 0);
  return {
    id: String(w[0].id),
    title: w[0].title ?? "Entrenamiento",
    routineId: w[0].routine_id ? String(w[0].routine_id) : null,
    startedAt: reqIso(w[0].started_at),
    endedAt: toIso(w[0].ended_at),
    durationSeconds: num(w[0].duration_seconds),
    notes: w[0].notes ?? null,
    photoData: w[0].photo_data ?? null,
    status: String(w[0].status),
    volume,
    setCount: sets.filter((s) => bool(s.completed)).length,
    exerciseCount: grouped.size,
    muscles,
    hasPr: blocks.some((b) => b.sets.some((s: { isPr?: boolean }) => s.isPr)),
    blocks
  };
});
export const upsertSet = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureSetKind(sql);
  if (!(await sql<AnyRow>`select count(*)::int as n from workouts where id = ${data.workoutId} and user_id = ${context.userId}`)[0]?.n) throw new Error("No autorizado");
  if (data.add) {
    const max = await sql<AnyRow>`select coalesce(max(set_order),-1)::int as m from workout_sets where workout_id = ${data.workoutId}`;
    const last = await sql<AnyRow>`
        select reps, weight, set_kind from workout_sets
        where workout_id = ${data.workoutId} and exercise_id = ${data.exerciseId}
        order by set_order desc limit 1
      `;
    const id = nid();
    await sql<AnyRow>`
        insert into workout_sets (id, workout_id, exercise_id, set_order, reps, weight, completed, set_kind)
        values (${id}, ${data.workoutId}, ${data.exerciseId}, ${(max[0]?.m ?? -1) + 1}, ${last[0]?.reps ?? 8}, ${last[0] ? num(last[0].weight) : 0}, false, 'work')
      `;
    return { id };
  }
  if (!data.id) throw new Error("Falta el set");
  await sql<AnyRow>`
      update workout_sets set
        reps = coalesce(${data.reps ?? null}, reps),
        weight = coalesce(${data.weight ?? null}, weight),
        rpe = coalesce(${data.rpe ?? null}, rpe),
        completed = coalesce(${data.completed ?? null}, completed),
        notes = coalesce(${data.notes ?? null}, notes),
        set_kind = coalesce(${data.setKind ?? null}, set_kind)
      where id = ${data.id} and workout_id = ${data.workoutId}
    `;
  return { id: data.id };
});
export const removeSet = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  await (await getSql())`
      delete from workout_sets s using workouts w
      where s.id = ${data.id} and s.workout_id = w.id and w.id = ${data.workoutId} and w.user_id = ${context.userId}
    `;
  return { ok: true };
});
export const addExerciseToWorkout = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureSetKind(sql);
  if (!(await sql<AnyRow>`select count(*)::int as n from workouts where id = ${data.workoutId} and user_id = ${context.userId}`)[0]?.n) throw new Error("No autorizado");
  const max = await sql<AnyRow>`select coalesce(max(set_order),-1)::int as m from workout_sets where workout_id = ${data.workoutId}`;
  const prev = await lastSetsFor(sql, context.userId, data.exerciseId);
  for (let i = 0; i < 3; i++) {
    const p = prev[i];
    await sql<AnyRow>`
        insert into workout_sets (id, workout_id, exercise_id, set_order, reps, weight, completed, set_kind)
        values (${nid()}, ${data.workoutId}, ${data.exerciseId}, ${(max[0]?.m ?? -1) + 1 + i}, ${p?.reps ?? 8}, ${p ? num(p.weight) : 0}, false, ${p ? mapKind(p.set_kind) : "work"})
      `;
  }
  return { ok: true };
});
export const setWorkoutStatus = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  const ended = data.status === "completed" ? (new Date()).toISOString() : null;
  await sql<AnyRow>`
      update workouts set
        status = ${data.status},
        duration_seconds = coalesce(${data.durationSeconds ?? null}, duration_seconds),
        notes = coalesce(${data.notes ?? null}, notes),
        photo_data = coalesce(${data.photoData ?? null}, photo_data),
        ended_at = coalesce(${ended}, ended_at)
      where id = ${data.id} and user_id = ${context.userId}
    `;
  if (data.status !== "completed") return {
    ok: true,
    newPrs: []
  };
  await ensurePulseV4(sql);
  const before = await sql<AnyRow>`
      select exercise_id, kind, one_rep_max, weight, reps, coalesce(volume,0) as volume
      from personal_records where user_id = ${context.userId}
    `;
  await recomputePrs(sql, context.userId);
  const after = await sql<AnyRow>`
      select exercise_id, kind, one_rep_max, weight, reps, coalesce(volume,0) as volume
      from personal_records where user_id = ${context.userId}
    `;
  const beforeMap = new Map(before.map((r) => [`${r.exercise_id}:${r.kind ?? "one_rm"}`, r]));
  const improvedIds = new Set<string>();
  for (const a of after) {
    const prev = beforeMap.get(`${a.exercise_id}:${a.kind ?? "one_rm"}`);
    const kind = String(a.kind ?? "one_rm");
    let hit = false;
    if (!prev) hit = true;
    else if (kind === "max_weight" && num(a.weight) > num(prev.weight) + 0.05) hit = true;
    else if (kind === "max_reps" && num(a.reps) > num(prev.reps)) hit = true;
    else if (kind === "max_volume" && num(a.volume) > num(prev.volume) + 0.5) hit = true;
    else if (kind === "one_rm" && num(a.one_rep_max) > num(prev.one_rep_max) + 0.4) hit = true;
    if (hit) improvedIds.add(String(a.exercise_id));
  }
  const newPrs: string[] = [];
  const prKeys: string[] = [];
  for (const exId of improvedIds) {
    const name = await sql<AnyRow>`select name from exercises where id = ${exId}`;
    newPrs.push(name[0]?.name ?? exId);
    if (exId === KEY_EXERCISES.squat) prKeys.push("pr_squat");
    if (exId === KEY_EXERCISES.bench) prKeys.push("pr_bench");
  }
  const sets = await sql<AnyRow>`
      select exercise_id, weight, reps, completed from workout_sets where workout_id = ${data.id}
    `;
  const titleRow = await sql<AnyRow>`select title from workouts where id = ${data.id}`;
  if (bool((await sql<AnyRow>`select public_profile from profiles where user_id = ${context.userId}`)[0]?.public_profile)) {
    const vol = sets.reduce((s, x) => s + (bool(x.completed) ? num(x.weight) * x.reps : 0), 0);
    await sql<AnyRow>`
        insert into activity_feed (id, user_id, kind, title, detail, workout_id, volume, duration_seconds)
        values (${nid()}, ${context.userId}, 'workout', ${"Completó " + (titleRow[0]?.title ?? "entrenamiento")}, ${newPrs[0] ? "PR: " + newPrs.join(", ") : null}, ${data.id}, ${vol}, ${data.durationSeconds ?? null})
      `;
  }
  const hour = (new Date()).getHours();
  await evaluateAchievements(sql, context.userId, {
    night: hour >= 22,
    prKeys
  });
  return {
    ok: true,
    newPrs
  };
});
export const listWorkouts = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d: {
  muscle?: string;
  range?: "all" | "week" | "month";
  kind?: "all" | "routine" | "free";
  q?: string;
} | undefined) => d ?? {}).handler(async ({ context, data }) => {
  const sql = await getSql();
  const range = data.range === "week" || data.range === "month" ? data.range : "all";
  const kind = data.kind === "routine" || data.kind === "free" ? data.kind : "all";
  const q = (data.q ?? "").trim().toLowerCase();
  let since: string | null = null;
  if (range === "week") since = startOfWeek().toISOString();
  if (range === "month") {
    const m = new Date();
    m.setDate(1);
    m.setHours(0, 0, 0, 0);
    since = m.toISOString();
  }
  const like = q ? `%${q}%` : null;
  return (await sql<AnyRow>`
      select w.id, w.title, w.started_at, w.duration_seconds, w.status, w.routine_id, w.notes,
        coalesce(sum(case when s.completed then s.weight * s.reps else 0 end),0) as volume,
        count(s.id) filter (where s.completed)::int as sets,
        count(distinct s.exercise_id)::int as exercises,
        (
          select string_agg(name, ' · ')
          from (
            select distinct e.name
            from workout_sets sx
            join exercises e on e.id = sx.exercise_id
            where sx.workout_id = w.id
            limit 3
          ) t
        ) as lifts,
        (
          select string_agg(muscle, ',')
          from (
            select distinct e.muscle
            from workout_sets sx
            join exercises e on e.id = sx.exercise_id
            where sx.workout_id = w.id
          ) t
        ) as muscles,
        exists (
          select 1 from personal_records pr
          where pr.user_id = w.user_id
            and pr.recorded_at::date = w.started_at::date
        ) as has_pr
      from workouts w
      left join workout_sets s on s.workout_id = w.id
      where w.user_id = ${context.userId} and w.status = 'completed'
        and (${since}::timestamptz is null or w.started_at >= ${since})
        and (
          ${kind}::text = 'all'
          or (${kind} = 'free' and w.routine_id is null)
          or (${kind} = 'routine' and w.routine_id is not null)
        )
        and (${data.muscle ?? null}::text is null or exists (
          select 1 from workout_sets sx join exercises ex on ex.id = sx.exercise_id
          where sx.workout_id = w.id and (
            ex.muscle = ${data.muscle ?? null}
            or (${data.muscle ?? null} = 'Core' and ex.muscle in ('Core','Abdomen'))
            or (${data.muscle ?? null} = 'Abdomen' and ex.muscle in ('Core','Abdomen'))
            or (${data.muscle ?? null} = 'Isquiotibiales' and ex.muscle = 'Femorales')
            or (${data.muscle ?? null} = 'Gemelos' and ex.muscle = 'Pantorrillas')
            or (${data.muscle ?? null} = 'Femorales' and ex.muscle = 'Femorales')
            or (${data.muscle ?? null} = 'Pantorrillas' and ex.muscle = 'Pantorrillas')
          )
        ))
        and (${like}::text is null or w.title ilike ${like} or exists (
          select 1 from workout_sets sx join exercises ex on ex.id = sx.exercise_id
          where sx.workout_id = w.id and ex.name ilike ${like}
        ))
      group by w.id
      order by w.started_at desc
      limit 80
    `).map((r) => ({
    id: String(r.id),
    title: String(r.title ?? "Entrenamiento"),
    startedAt: reqIso(r.started_at),
    durationSeconds: num(r.duration_seconds),
    status: String(r.status ?? "completed"),
    routineId: r.routine_id ? String(r.routine_id) : null,
    notes: r.notes ? String(r.notes) : null,
    volume: num(r.volume),
    setCount: num(r.sets),
    exerciseCount: num(r.exercises),
    lifts: r.lifts ? String(r.lifts) : null,
    muscles: r.muscles ? String(r.muscles).split(",").filter(Boolean).map((m) => String(normalizeMuscle(m))) : [],
    hasPr: bool(r.has_pr)
  }));
});
export const saveBlockNote = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensurePulseV4(sql);
  if (!(await sql<AnyRow>`select count(*)::int as n from workouts where id = ${data.workoutId} and user_id = ${context.userId}`)[0]?.n) {
    throw new Error("No autorizado");
  }
  const notes = String(data.notes ?? "").trim() || null;
  if (!notes) {
    await sql<AnyRow>`delete from workout_block_notes where workout_id = ${data.workoutId} and exercise_id = ${data.exerciseId}`;
    return { ok: true };
  }
  await sql<AnyRow>`
    insert into workout_block_notes (workout_id, exercise_id, notes)
    values (${data.workoutId}, ${data.exerciseId}, ${notes})
    on conflict (workout_id, exercise_id) do update set notes = excluded.notes
  `;
  return { ok: true };
});
export const deleteWorkout = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: { id: string }) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  const row = await sql<AnyRow>`select id from workouts where id = ${data.id} and user_id = ${context.userId}`;
  if (!row[0]) throw new Error("Entrenamiento no encontrado");
  await sql<AnyRow>`delete from workout_block_notes where workout_id = ${data.id}`;
  await sql<AnyRow>`delete from activity_feed where workout_id = ${data.id} and user_id = ${context.userId}`;
  await sql<AnyRow>`delete from workout_comments where workout_id = ${data.id}`;
  await sql<AnyRow>`delete from workout_likes where workout_id = ${data.id}`;
  await sql<AnyRow>`delete from workout_sets where workout_id = ${data.id}`;
  await sql<AnyRow>`delete from workouts where id = ${data.id} and user_id = ${context.userId}`;
  await recomputePrs(sql, context.userId);
  return { ok: true };
});
export const duplicateWorkout = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: { id: string }) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureSetKind(sql);
  await ensurePulseV4(sql);
  const open = await sql<AnyRow>`
    select id from workouts where user_id = ${context.userId} and status in ('in_progress','paused')
    order by started_at desc limit 1
  `;
  if (open[0]) {
    return { id: String(open[0].id), resumed: true };
  }
  const src = await sql<AnyRow>`select * from workouts where id = ${data.id} and user_id = ${context.userId}`;
  if (!src[0]) throw new Error("Entrenamiento no encontrado");
  const id = nid();
  const title = String(src[0].title ?? "Entrenamiento");
  await sql<AnyRow>`
    insert into workouts (id, user_id, routine_id, title, status, source)
    values (${id}, ${context.userId}, ${src[0].routine_id ?? null}, ${title}, 'in_progress', ${"manual"})
  `;
  const sets = await sql<AnyRow>`
    select exercise_id, set_order, reps, weight, rpe, set_kind
    from workout_sets where workout_id = ${data.id} order by set_order
  `;
  for (const s of sets) {
    await sql<AnyRow>`
      insert into workout_sets (id, workout_id, exercise_id, set_order, reps, weight, rpe, completed, set_kind)
      values (${nid()}, ${id}, ${s.exercise_id}, ${num(s.set_order)}, ${num(s.reps)}, ${num(s.weight)}, ${numNull(s.rpe)}, false, ${mapKind(s.set_kind)})
    `;
  }
  const notes = await sql<AnyRow>`select exercise_id, notes from workout_block_notes where workout_id = ${data.id}`;
  for (const n of notes) {
    if (!n.notes) continue;
    await sql<AnyRow>`
      insert into workout_block_notes (workout_id, exercise_id, notes)
      values (${id}, ${n.exercise_id}, ${n.notes})
    `;
  }
  return { id, resumed: false };
});
export const updateCompletedWorkout = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensureSetKind(sql);
  await ensurePulseV4(sql);
  const w = await sql<AnyRow>`select id, status from workouts where id = ${data.id} and user_id = ${context.userId}`;
  if (!w[0]) throw new Error("Entrenamiento no encontrado");
  const title = String(data.title ?? "").trim() || "Entrenamiento";
  const notes = data.notes != null ? String(data.notes) : null;
  const duration = data.durationSeconds != null ? Math.max(0, Math.round(Number(data.durationSeconds))) : null;
  const startedAt = data.startedAt ? new Date(data.startedAt) : null;
  if (startedAt && Number.isNaN(startedAt.getTime())) throw new Error("Fecha no válida");
  await sql<AnyRow>`
    update workouts set
      title = ${title},
      notes = ${notes},
      duration_seconds = coalesce(${duration}, duration_seconds),
      started_at = coalesce(${startedAt ? startedAt.toISOString() : null}, started_at),
      ended_at = coalesce(${startedAt && duration != null ? new Date(startedAt.getTime() + duration * 1000).toISOString() : null}, ended_at)
    where id = ${data.id} and user_id = ${context.userId}
  `;
  const blocks = Array.isArray(data.blocks) ? data.blocks : null;
  if (blocks) {
    await sql<AnyRow>`delete from workout_sets where workout_id = ${data.id}`;
    await sql<AnyRow>`delete from workout_block_notes where workout_id = ${data.id}`;
    let order = 0;
    for (const b of blocks) {
      const exerciseId = String(b.exerciseId ?? "");
      if (!exerciseId) continue;
      const blockNote = String(b.notes ?? "").trim();
      if (blockNote) {
        await sql<AnyRow>`
          insert into workout_block_notes (workout_id, exercise_id, notes)
          values (${data.id}, ${exerciseId}, ${blockNote})
        `;
      }
      const setList = Array.isArray(b.sets) ? b.sets : [];
      for (const s of setList) {
        await sql<AnyRow>`
          insert into workout_sets (id, workout_id, exercise_id, set_order, reps, weight, rpe, completed, notes, set_kind)
          values (
            ${nid()}, ${data.id}, ${exerciseId}, ${order},
            ${Math.max(0, Math.round(Number(s.reps) || 0))},
            ${Math.max(0, Number(s.weight) || 0)},
            ${s.rpe == null || s.rpe === "" ? null : Math.min(10, Math.max(0, Number(s.rpe)))},
            ${s.completed !== false},
            ${s.notes ? String(s.notes) : null},
            ${mapKind(s.kind ?? s.setKind)}
          )
        `;
        order += 1;
      }
    }
  }
  if (w[0].status === "completed") await recomputePrs(sql, context.userId);
  return { ok: true };
});
export const getConsistency = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await getSql();
  await ensureProfile(sql, context.userId);
  const since = new Date();
  since.setDate(since.getDate() - 98);
  const profile = await sql<AnyRow>`
      select weekly_goal from profiles where user_id = ${context.userId}
    `;
  const plan = await sql<AnyRow>`
      select wp.weekday, wp.routine_id, r.name
      from weekly_plan wp
      left join routines r on r.id = wp.routine_id
      where wp.user_id = ${context.userId}
      order by weekday
    `;
  const rows = await sql<AnyRow>`
      select w.id, w.title, w.started_at, w.duration_seconds,
        coalesce(sum(case when s.completed then s.weight * s.reps else 0 end),0) as volume,
        count(s.id) filter (where s.completed)::int as sets
      from workouts w
      left join workout_sets s on s.workout_id = w.id
      where w.user_id = ${context.userId} and w.status = 'completed'
        and w.started_at >= ${since.toISOString()}
      group by w.id
      order by w.started_at desc
    `;
  const lifts = rows.map((r) => r.id).length ? await sql<AnyRow>`
          select s.workout_id, e.name, min(s.set_order)::int as ord
          from workout_sets s
          join workouts w on w.id = s.workout_id
          join exercises e on e.id = s.exercise_id
          where w.user_id = ${context.userId} and w.status = 'completed'
            and w.started_at >= ${since.toISOString()}
          group by s.workout_id, e.name
          order by s.workout_id, ord
        ` : [];
  const liftMap = new Map<string, string[]>();
  for (const row of lifts) {
    const arr = liftMap.get(String(row.workout_id)) ?? [];
    if (arr.length < 4 && !arr.includes(String(row.name))) arr.push(String(row.name));
    liftMap.set(String(row.workout_id), arr);
  }
  return {
    weeklyGoal: num(profile[0]?.weekly_goal) || 4,
    plan: plan.map((p) => ({
      weekday: num(p.weekday),
      routineId: p.routine_id ? String(p.routine_id) : null,
      routineName: p.name ? String(p.name) : null
    })),
    sessions: rows.map((r) => ({
      id: String(r.id),
      startedAt: reqIso(r.started_at),
      title: String(r.title ?? "Entrenamiento"),
      durationSeconds: num(r.duration_seconds),
      volume: num(r.volume),
      setCount: num(r.sets),
      exercises: liftMap.get(String(r.id)) ?? []
    }))
  };
});
export const getProgress = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await getSql();
  const weight = await sql<AnyRow>`
      select logged_at as d, weight_kg as w from body_logs
      where user_id = ${context.userId} and weight_kg is not null
      order by logged_at
    `;
  const volumeMonth = await sql<AnyRow>`
      select to_char(date_trunc('month', w.started_at), 'YYYY-MM') as m,
             coalesce(sum(s.weight * s.reps),0) as volume
      from workouts w join workout_sets s on s.workout_id = w.id and s.completed = true
      where w.user_id = ${context.userId} and w.status = 'completed'
      group by 1 order by 1
    `;
  const muscles = await sql<AnyRow>`
      select e.muscle, coalesce(sum(s.weight * s.reps),0) as volume
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and w.status = 'completed' and s.completed = true
      group by e.muscle order by volume desc
    `;
  const heatmap = await sql<AnyRow>`
      select started_at::date as d, count(*)::int as n
      from workouts
      where user_id = ${context.userId} and status = 'completed'
        and started_at >= ${(new Date(Date.now() - 10368e6)).toISOString()}
      group by 1
    `;
  const photos = await sql<AnyRow>`
      select id, taken_at, image_data, caption from progress_photos
      where user_id = ${context.userId} order by taken_at
    `;
  const weekStart = startOfWeek();
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const weekIso = weekStart.toISOString();
  const prevIso = prevWeekStart.toISOString();
  const weekRow = await sql<AnyRow>`
      select
        count(distinct w.id)::int as workouts,
        count(s.id) filter (where s.completed)::int as sets,
        coalesce(sum(case when s.completed then s.weight * s.reps else 0 end),0) as volume,
        coalesce(sum(distinct w.duration_seconds),0) as duration
      from workouts w
      left join workout_sets s on s.workout_id = w.id
      where w.user_id = ${context.userId} and w.status = 'completed' and w.started_at >= ${weekIso}
    `;
  const prevRow = await sql<AnyRow>`
      select
        count(distinct w.id)::int as workouts,
        count(s.id) filter (where s.completed)::int as sets,
        coalesce(sum(case when s.completed then s.weight * s.reps else 0 end),0) as volume
      from workouts w
      left join workout_sets s on s.workout_id = w.id
      where w.user_id = ${context.userId} and w.status = 'completed'
        and w.started_at >= ${prevIso} and w.started_at < ${weekIso}
    `;
  await ensurePulseV4(sql);
  const recentPrs = await sql<AnyRow>`
      select pr.id, pr.exercise_id, e.name, e.muscle, pr.kind, pr.one_rep_max, pr.weight, pr.reps, pr.volume, pr.recorded_at
      from personal_records pr
      join exercises e on e.id = pr.exercise_id
      where pr.user_id = ${context.userId}
      order by pr.recorded_at desc
      limit 12
    `;
  const profile = await sql<AnyRow>`select weekly_goal from profiles where user_id = ${context.userId}`;
  const streak = await computeStreak(sql, context.userId);
  return {
    weight: weight.map((r) => ({
      date: String(r.d).slice(0, 10),
      weight: num(r.w)
    })),
    volumeMonth: volumeMonth.map((r) => ({
      month: r.m,
      volume: num(r.volume)
    })),
    muscles: muscles.map((m) => ({
      muscle: m.muscle,
      volume: num(m.volume)
    })),
    heatmap: heatmap.map((h) => ({
      date: String(h.d).slice(0, 10),
      count: h.n
    })),
    photos,
    week: {
      workouts: num(weekRow[0]?.workouts),
      sets: num(weekRow[0]?.sets),
      volume: num(weekRow[0]?.volume),
      duration: num(weekRow[0]?.duration),
    },
    prevWeek: {
      workouts: num(prevRow[0]?.workouts),
      sets: num(prevRow[0]?.sets),
      volume: num(prevRow[0]?.volume),
    },
    recentPrs: recentPrs.map((p) => ({
      id: String(p.id),
      exerciseId: String(p.exercise_id),
      name: String(p.name),
      muscle: String(p.muscle),
      kind: String(p.kind ?? "one_rm"),
      oneRepMax: num(p.one_rep_max),
      weight: num(p.weight),
      reps: num(p.reps),
      volume: num(p.volume),
      recordedAt: reqIso(p.recorded_at),
    })),
    weeklyGoal: num(profile[0]?.weekly_goal) || 4,
    streak,
    compare: (() => {
      const months = volumeMonth.map((r) => ({
        month: r.m,
        volume: num(r.volume)
      }));
      const last = months.at(-1)?.volume ?? 0;
      const prev = months.at(-2)?.volume ?? 0;
      return {
        last,
        prev,
        pct: prev > 0 ? Math.round((last - prev) / prev * 100) : last > 0 ? 100 : 0
      };
    })()
  };
});
export const addBodyLog = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensurePulseV3(sql);
  await sql<AnyRow>`
      insert into body_logs (id, user_id, logged_at, weight_kg, chest_cm, waist_cm, arm_cm, thigh_cm, source)
      values (${nid()}, ${context.userId}, ${(new Date()).toISOString().slice(0, 10)}, ${data.weightKg ?? null}, ${data.chestCm ?? null}, ${data.waistCm ?? null}, ${data.armCm ?? null}, ${data.thighCm ?? null}, ${"manual"})
    `;
  if (data.weightKg) await sql<AnyRow>`update profiles set weight_kg = ${data.weightKg} where user_id = ${context.userId}`;
  return { ok: true };
});
export const addProgressPhoto = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  if (data.imageData.length > 35e4) throw new Error("La foto es demasiado pesada");
  await (await getSql())`
      insert into progress_photos (id, user_id, taken_at, image_data, caption)
      values (${nid()}, ${context.userId}, ${(new Date()).toISOString().slice(0, 10)}, ${data.imageData}, ${data.caption ?? null})
    `;
  return { ok: true };
});
export const getStats = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await getSql();
  const totals = await sql<AnyRow>`
      select
        count(distinct w.id)::int as workouts,
        coalesce(sum(case when s.completed then s.weight * s.reps else 0 end),0) as volume,
        coalesce(avg(w.duration_seconds),0) as duration,
        count(s.id) filter (where s.completed)::int as sets
      from workouts w
      left join workout_sets s on s.workout_id = w.id
      where w.user_id = ${context.userId} and w.status = 'completed'
    `;
  const topEx = await sql<AnyRow>`
      select e.name, count(*)::int as n
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and s.completed = true
      group by e.name order by n desc limit 1
    `;
  const topMuscle = await sql<AnyRow>`
      select e.muscle, count(*)::int as n
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and s.completed = true
      group by e.muscle order by n desc limit 1
    `;
  const hour = await sql<AnyRow>`
      select extract(hour from started_at)::int as h, count(*)::int as n
      from workouts where user_id = ${context.userId} and status = 'completed'
      group by 1 order by n desc limit 1
    `;
  const dow = await sql<AnyRow>`
      select extract(dow from started_at)::int as d, count(*)::int as n
      from workouts where user_id = ${context.userId} and status = 'completed'
      group by 1 order by n desc limit 1
    `;
  const unlocked = await sql<AnyRow>`
      select key, unlocked_at from achievements where user_id = ${context.userId}
    `;
  const map = new Map(unlocked.map((u) => [u.key, toIso(u.unlocked_at)]));
  const streak = await computeStreak(sql, context.userId);
  return {
    workouts: totals[0]?.workouts ?? 0,
    volume: num(totals[0]?.volume),
    avgDuration: num(totals[0]?.duration),
    sets: totals[0]?.sets ?? 0,
    topExercise: topEx[0]?.name ?? "—",
    topMuscle: topMuscle[0]?.muscle ?? "—",
    favoriteHour: hour[0] ? `${hour[0].h}:00` : "—",
    favoriteDay: dow[0] ? [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado"
    ][dow[0].d] : "—",
    streak,
    achievements: ACHIEVEMENT_DEFS.map((a) => ({
      key: a.key,
      name: a.name,
      description: a.description,
      icon: a.icon,
      tier: a.tier,
      unlockedAt: map.get(a.key) ?? null
    }))
  };
});
export const getPlan = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await getSql();
  await ensureProfile(sql, context.userId);
  return {
    days: await sql<AnyRow>`
      select wp.weekday, wp.routine_id, r.name, r.color
      from weekly_plan wp
      left join routines r on r.id = wp.routine_id
      where wp.user_id = ${context.userId}
      order by weekday
    `,
    routines: (await sql<AnyRow>`
      select id, name, color from routines where user_id = ${context.userId} and is_archived = false
    `).map((r) => ({
      id: r.id,
      name: r.name,
      color: r.color
    }))
  };
});
export const setPlanDay = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  await (await getSql())`
      insert into weekly_plan (id, user_id, weekday, routine_id)
      values (${nid()}, ${context.userId}, ${data.weekday}, ${data.routineId})
      on conflict (user_id, weekday) do update set routine_id = excluded.routine_id
    `;
  return { ok: true };
});
export const getFeed = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await getSql();
  await ensureProfile(sql, context.userId);
  await ensurePulseV2(sql);
  const demo = "pulse-demo-%";
  const items = await sql<AnyRow>`
      select a.id, a.user_id, a.kind, a.title, a.detail, a.created_at, p.display_name, p.image,
        a.volume, a.duration_seconds,
        (select count(*)::int from feed_likes l where l.feed_id = a.id) as likes,
        (select count(*)::int from feed_comments c where c.feed_id = a.id) as comments,
        exists(select 1 from feed_likes l where l.feed_id = a.id and l.user_id = ${context.userId}) as liked
      from activity_feed a
      join profiles p on p.user_id = a.user_id
      where a.user_id not like ${demo}
        and (
          a.user_id = ${context.userId}
          or (p.public_profile = true and a.user_id in (select following_id from follows where follower_id = ${context.userId}))
        )
      order by a.created_at desc
      limit 40
    `;
  const people = await sql<AnyRow>`
      select p.user_id, p.display_name, p.image, p.goal,
        exists(select 1 from follows f where f.follower_id = ${context.userId} and f.following_id = p.user_id) as following
      from profiles p
      where p.public_profile = true and p.user_id <> ${context.userId} and p.user_id not like ${demo}
        and p.onboarding_done = true
    `;
  return {
    items: items.map((i) => ({
      id: String(i.id),
      userId: String(i.user_id),
      kind: String(i.kind),
      title: String(i.title ?? ""),
      detail: i.detail ? String(i.detail) : null,
      createdAt: reqIso(i.created_at),
      name: String(i.display_name ?? "Atleta"),
      image: i.image ? String(i.image) : null,
      volume: num(i.volume),
      durationSeconds: num(i.duration_seconds),
      likeCount: num(i.likes),
      commentCount: num(i.comments),
      liked: bool(i.liked),
      mine: i.user_id === context.userId
    })),
    people: people.map((p) => ({
      userId: String(p.user_id),
      name: String(p.display_name ?? "Atleta"),
      image: p.image ? String(p.image) : null,
      goal: p.goal ? String(p.goal) : null,
      following: bool(p.following)
    }))
  };
});
export const toggleFollow = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  if (data.userId === context.userId) return { following: false };
  if (isDemoUserId(String(data.userId ?? ""))) return { following: false };
  const sql = await getSql();
  if (((await sql<AnyRow>`
      select count(*)::int as n from follows where follower_id = ${context.userId} and following_id = ${data.userId}
    `)[0]?.n ?? 0) > 0) {
    await sql<AnyRow>`delete from follows where follower_id = ${context.userId} and following_id = ${data.userId}`;
    return { following: false };
  }
  await sql<AnyRow>`insert into follows (follower_id, following_id) values (${context.userId}, ${data.userId})`;
  return { following: true };
});
export const exportData = createServerFn({ method: "GET" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await getSql();
  const workouts = await sql<AnyRow>`select id, title, started_at, duration_seconds, status from workouts where user_id = ${context.userId} order by started_at`;
  const sets = await sql<AnyRow>`
      select s.id, s.workout_id, s.exercise_id, s.set_order, s.reps, s.weight, s.completed
      from workout_sets s join workouts w on w.id = s.workout_id
      where w.user_id = ${context.userId}
    `;
  const routines = await sql<AnyRow>`select id, name from routines where user_id = ${context.userId}`;
  return {
    workouts: workouts.map((w) => ({
      id: w.id,
      title: w.title,
      startedAt: toIso(w.started_at) ?? "",
      durationSeconds: w.duration_seconds,
      status: w.status
    })),
    sets: sets.map((s) => ({
      id: s.id,
      workoutId: s.workout_id,
      exerciseId: s.exercise_id,
      setOrder: s.set_order,
      reps: s.reps,
      weight: num(s.weight),
      completed: bool(s.completed)
    })),
    routines,
    exportedAt: (new Date()).toISOString()
  };
});
export const deleteAccountData = createServerFn({ method: "POST" }).middleware([authMiddleware]).handler(async ({ context }) => {
  const sql = await getSql();
  const uid = context.userId;
  await sql<AnyRow>`delete from feed_comments where user_id = ${uid} or feed_id in (select id from activity_feed where user_id = ${uid})`;
  await sql<AnyRow>`delete from feed_likes where user_id = ${uid} or feed_id in (select id from activity_feed where user_id = ${uid})`;
  await sql<AnyRow>`delete from workout_comments where user_id = ${uid}`;
  await sql<AnyRow>`delete from workout_likes where user_id = ${uid}`;
  await sql<AnyRow>`delete from follows where follower_id = ${uid} or following_id = ${uid}`;
  await sql<AnyRow>`delete from activity_feed where user_id = ${uid}`;
  await sql<AnyRow>`delete from progress_photos where user_id = ${uid}`;
  await sql<AnyRow>`delete from body_logs where user_id = ${uid}`;
  await sql<AnyRow>`delete from weekly_plan where user_id = ${uid}`;
  await sql<AnyRow>`delete from achievements where user_id = ${uid}`;
  await sql<AnyRow>`delete from personal_records where user_id = ${uid}`;
  await sql<AnyRow>`delete from exercise_favorites where user_id = ${uid}`;
  await sql<AnyRow>`delete from workout_block_notes where workout_id in (select id from workouts where user_id = ${uid})`;
  await sql<AnyRow>`delete from workout_sets where workout_id in (select id from workouts where user_id = ${uid})`;
  await sql<AnyRow>`delete from workouts where user_id = ${uid}`;
  await sql<AnyRow>`delete from routine_exercises where routine_id in (select id from routines where user_id = ${uid})`;
  await sql<AnyRow>`delete from routines where user_id = ${uid}`;
  await sql<AnyRow>`delete from exercises where user_id = ${uid}`;
  await sql<AnyRow>`delete from profiles where user_id = ${uid}`;
  return { ok: true };
});
export const getMuscleLoad = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { period?: "week" | "month" | "quarter" | "year" | "all" } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensurePulseV2(sql);
    const period = data.period ?? "week";
    const days = period === "month" ? 30 : period === "quarter" ? 90 : period === "year" ? 365 : period === "all" ? null : 7;
    const since = days == null ? null : new Date(Date.now() - days * 86400000).toISOString();
    const prevSince = days == null ? null : new Date(Date.now() - days * 2 * 86400000).toISOString();
    const rows = await sql<AnyRow>`
      select e.muscle, count(*)::int as sets, coalesce(sum(s.weight * s.reps),0) as volume, max(w.started_at) as last
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and w.status = 'completed' and s.completed = true
        and (${since}::timestamptz is null or w.started_at >= ${since})
      group by e.muscle
    `;
    const prevRows = days == null ? [] : await sql<AnyRow>`
      select e.muscle, count(*)::int as sets, coalesce(sum(s.weight * s.reps),0) as volume
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and w.status = 'completed' and s.completed = true
        and w.started_at >= ${prevSince} and w.started_at < ${since}
      group by e.muscle
    `;
    const map = new Map<string, { sets: number; volume: number; last: string | null; prevSets: number; prevVolume: number }>();
    for (const r of rows) {
      const key = String(normalizeMuscle(r.muscle));
      const cur = map.get(key) ?? { sets: 0, volume: 0, last: null, prevSets: 0, prevVolume: 0 };
      const last = toIso(r.last);
      map.set(key, {
        ...cur,
        sets: cur.sets + num(r.sets),
        volume: cur.volume + num(r.volume),
        last: last && (!cur.last || last > cur.last) ? last : cur.last,
      });
    }
    for (const r of prevRows) {
      const key = String(normalizeMuscle(r.muscle));
      const cur = map.get(key) ?? { sets: 0, volume: 0, last: null, prevSets: 0, prevVolume: 0 };
      map.set(key, { ...cur, prevSets: cur.prevSets + num(r.sets), prevVolume: cur.prevVolume + num(r.volume) });
    }
    const topEx = await sql<AnyRow>`
      select e.muscle, e.name, count(*)::int as n
      from workout_sets s
      join workouts w on w.id = s.workout_id
      join exercises e on e.id = s.exercise_id
      where w.user_id = ${context.userId} and w.status = 'completed' and s.completed = true
        and (${since}::timestamptz is null or w.started_at >= ${since})
      group by e.muscle, e.name
      order by n desc
    `;
    return {
      loads: [...map.entries()].map(([muscle, v]) => ({
        muscle,
        sets: v.sets,
        volume: v.volume,
        last: v.last,
        prevSets: v.prevSets,
        prevVolume: v.prevVolume,
      })),
      topExercises: topEx.map((t) => ({
        muscle: String(normalizeMuscle(t.muscle)),
        name: String(t.name),
        sets: num(t.n),
      })),
    };
  });
export const toggleFeedLike = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensurePulseV2(sql);
  if (((await sql<AnyRow>`
      select count(*)::int as n from feed_likes where feed_id = ${data.feedId} and user_id = ${context.userId}
    `)[0]?.n ?? 0) > 0) {
    await sql<AnyRow>`delete from feed_likes where feed_id = ${data.feedId} and user_id = ${context.userId}`;
    return { liked: false };
  }
  await sql<AnyRow>`insert into feed_likes (feed_id, user_id) values (${data.feedId}, ${context.userId})`;
  return { liked: true };
});
export const listFeedComments = createServerFn({ method: "GET" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const sql = await getSql();
  await ensurePulseV2(sql);
  return (await sql<AnyRow>`
      select c.id, c.user_id, c.body, c.created_at, p.display_name, p.image
      from feed_comments c
      join profiles p on p.user_id = c.user_id
      where c.feed_id = ${data.feedId}
      order by c.created_at
    `).map((r) => ({
    id: r.id,
    userId: r.user_id,
    body: r.body,
    createdAt: reqIso(r.created_at),
    name: r.display_name ?? "Atleta",
    image: r.image,
    mine: r.user_id === context.userId
  }));
});
export const addFeedComment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const body = data.body.trim().slice(0, 280);
  if (!body) throw new Error("El comentario no puede estar vacío");
  const sql = await getSql();
  await ensurePulseV2(sql);
  const id = nid();
  await sql<AnyRow>`
      insert into feed_comments (id, feed_id, user_id, body)
      values (${id}, ${data.feedId}, ${context.userId}, ${body})
    `;
  return { id };
});
export const deleteFeedComment = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  await (await getSql())`delete from feed_comments where id = ${data.id} and user_id = ${context.userId}`;
  return { ok: true };
});
export const createFeedPost = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  const title = data.title.trim().slice(0, 280);
  if (!title) throw new Error("Escribe algo para publicar");
  const sql = await getSql();
  await ensurePulseV2(sql);
  const id = nid();
  await sql<AnyRow>`
      insert into activity_feed (id, user_id, kind, title)
      values (${id}, ${context.userId}, 'post', ${title})
    `;
  return { id };
});
export const deleteFeedPost = createServerFn({ method: "POST" }).middleware([authMiddleware]).validator((d: any) => d).handler(async ({ context, data }) => {
  await (await getSql())`delete from activity_feed where id = ${data.id} and user_id = ${context.userId}`;
  return { ok: true };
});

export const uploadAvatar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { dataUrl: string }) => d)
  .handler(async ({ context, data }) => {
    const { deleteStoredAvatar, storeAvatar } = await import("./avatar-store");
    const sql = await getSql();
    await ensureProfile(sql, context.userId);
    const url = await storeAvatar(context.userId, data.dataUrl);
    const prev = await sql<AnyRow>`select image from profiles where user_id = ${context.userId}`;
    await sql`update profiles set image = ${url}, updated_at = now() where user_id = ${context.userId}`;
    const old = prev[0]?.image ? String(prev[0].image) : null;
    if (old && old !== url) await deleteStoredAvatar(old, context.userId);
    return { image: url };
  });

export const deleteAvatar = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const { deleteStoredAvatar } = await import("./avatar-store");
    const sql = await getSql();
    const prev = await sql<AnyRow>`select image from profiles where user_id = ${context.userId}`;
    await sql`update profiles set image = null, updated_at = now() where user_id = ${context.userId}`;
    await deleteStoredAvatar(prev[0]?.image ? String(prev[0].image) : null, context.userId);
    return { image: null };
  });

export const listLibraryTemplates = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => libraryTemplates());

export const cloneLibraryTemplate = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { key: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ensureCatalog(sql);
    return insertLibraryTemplate(sql, context.userId, String(data.key));
  });

export const devToolsAvailable = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => ({ enabled: isDevToolsEnabled() }));

export const purgeMySeededData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    if (!isDevToolsEnabled()) throw new Error("No disponible en producción.");
    const sql = await getSql();
    await purgeUserSeededTraining(sql, context.userId);
    return { ok: true };
  });

