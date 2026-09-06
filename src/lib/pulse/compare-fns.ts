import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { computeStreaks, localISO, restWeekdaysFromPlan } from "./consistency";
import {
  compareAccess,
  DEFAULT_COMPARE_PREFS,
  parseComparePeriod,
  periodOrigin,
  prKey,
  sharedMetrics,
  type ComparePeriod,
  type ComparePrefs,
} from "./compare";
import { ensurePulseV8 } from "./seed";
import { formatHandle, normalizeUsername, rateLimit, socialError } from "./social";

type AnyRow = Record<string, unknown>;

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function bool(v: unknown) {
  return v === true || v === "t" || v === "true";
}

function mapPrefs(r: AnyRow | undefined | null): ComparePrefs {
  if (!r) return { ...DEFAULT_COMPARE_PREFS };
  return {
    enabled: bool(r.compare_enabled),
    workouts: bool(r.compare_workouts),
    days: bool(r.compare_days),
    streak: bool(r.compare_streak),
    sets: bool(r.compare_sets),
    volume: bool(r.compare_volume),
    exercises: bool(r.compare_exercises),
    prs: bool(r.compare_prs),
  };
}

async function ready(sql: Sql) {
  await ensurePulseV8(sql);
}

async function isBlockedEitherWay(sql: Sql, a: string, b: string): Promise<boolean> {
  const rows = await sql<AnyRow>`
    select 1 from user_blocks
    where (blocker_id = ${a} and blocked_id = ${b})
       or (blocker_id = ${b} and blocked_id = ${a})
    limit 1
  `;
  return Boolean(rows[0]);
}

async function followStatus(sql: Sql, followerId: string, followingId: string): Promise<string | null> {
  const rows = await sql<AnyRow>`
    select status from follows
    where follower_id = ${followerId} and following_id = ${followingId}
    limit 1
  `;
  const s = rows[0]?.status;
  return s === "accepted" || s === "pending" ? s : null;
}

async function loadPrefs(sql: Sql, userId: string): Promise<ComparePrefs> {
  const rows = await sql<AnyRow>`
    select compare_enabled, compare_workouts, compare_days, compare_streak,
           compare_sets, compare_volume, compare_exercises, compare_prs
    from profiles where user_id = ${userId}
  `;
  return mapPrefs(rows[0]);
}

async function currentStreak(sql: Sql, userId: string): Promise<number> {
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
  const trained = new Set(rows.map((r) => localISO(new Date(String(r.started_at)))));
  const { hasPlan, rest } = restWeekdaysFromPlan(
    plan.map((p) => ({
      weekday: num(p.weekday),
      routineId: p.routine_id ? String(p.routine_id) : null,
      routineName: p.name ? String(p.name) : null,
    })),
  );
  return computeStreaks(trained, rest, hasPlan, new Date()).current;
}

type Totals = { workouts: number; days: number; sets: number; volume: number };

async function periodTotals(sql: Sql, userId: string, fromIso: string): Promise<Totals> {
  const totals = await sql<AnyRow>`
    select
      count(distinct w.id)::int as workouts,
      count(s.id) filter (
        where s.completed = true and coalesce(s.set_kind, 'work') <> 'warmup'
      )::int as sets,
      coalesce(sum(
        case when s.completed = true and coalesce(s.set_kind, 'work') <> 'warmup'
          then s.weight * s.reps else 0 end
      ), 0) as volume
    from workouts w
    left join workout_sets s on s.workout_id = w.id
    where w.user_id = ${userId} and w.status = 'completed' and w.started_at >= ${fromIso}
  `;
  const started = await sql<AnyRow>`
    select started_at from workouts
    where user_id = ${userId} and status = 'completed' and started_at >= ${fromIso}
  `;
  const days = new Set(started.map((r) => localISO(new Date(String(r.started_at))))).size;
  return {
    workouts: num(totals[0]?.workouts),
    days,
    sets: num(totals[0]?.sets),
    volume: num(totals[0]?.volume),
  };
}

type ExRow = { exerciseId: string; name: string; muscle: string; sets: number; volume: number; bestWeight: number };

async function periodExercises(sql: Sql, userId: string, fromIso: string): Promise<ExRow[]> {
  const rows = await sql<AnyRow>`
    select e.id, e.name, e.muscle,
      count(s.id) filter (
        where s.completed = true and coalesce(s.set_kind, 'work') <> 'warmup'
      )::int as sets,
      coalesce(sum(
        case when s.completed = true and coalesce(s.set_kind, 'work') <> 'warmup'
          then s.weight * s.reps else 0 end
      ), 0) as volume,
      coalesce(max(
        case when s.completed = true and coalesce(s.set_kind, 'work') <> 'warmup'
          then s.weight else 0 end
      ), 0) as best_weight
    from workout_sets s
    join workouts w on w.id = s.workout_id
    join exercises e on e.id = s.exercise_id
    where w.user_id = ${userId}
      and w.status = 'completed'
      and w.started_at >= ${fromIso}
      and e.user_id is null
    group by e.id, e.name, e.muscle
    having count(s.id) filter (
      where s.completed = true and coalesce(s.set_kind, 'work') <> 'warmup'
    ) > 0
  `;
  return rows.map((r) => ({
    exerciseId: String(r.id),
    name: String(r.name ?? "Ejercicio"),
    muscle: String(r.muscle ?? ""),
    sets: num(r.sets),
    volume: num(r.volume),
    bestWeight: num(r.best_weight),
  }));
}

type PrRow = {
  exerciseId: string;
  name: string;
  kind: string;
  weight: number;
  reps: number;
  volume: number;
};

async function periodPrs(sql: Sql, userId: string, fromIso: string): Promise<PrRow[]> {
  const rows = await sql<AnyRow>`
    select pr.exercise_id, e.name, pr.kind, pr.weight, pr.reps, pr.volume, pr.recorded_at
    from personal_records pr
    join exercises e on e.id = pr.exercise_id
    where pr.user_id = ${userId}
      and pr.recorded_at >= ${fromIso}
      and e.user_id is null
    order by pr.recorded_at desc
  `;
  const best = new Map<string, PrRow>();
  for (const r of rows) {
    const exerciseId = String(r.exercise_id);
    const kind = String(r.kind ?? "one_rm");
    const k = prKey(exerciseId, kind);
    if (best.has(k)) continue;
    best.set(k, {
      exerciseId,
      name: String(r.name ?? "Ejercicio"),
      kind,
      weight: num(r.weight),
      reps: num(r.reps),
      volume: num(r.volume),
    });
  }
  return [...best.values()];
}

export type CompareFriend = {
  userId: string;
  username: string;
  handle: string;
  name: string;
  image: string | null;
};

export type CompareSide = {
  workouts?: number;
  days?: number;
  streak?: number;
  sets?: number;
  volume?: number;
};

export type CompareExercise = {
  exerciseId: string;
  name: string;
  muscle: string;
  you: { sets: number; volume: number; bestWeight: number };
  them: { sets: number; volume: number; bestWeight: number };
};

export type ComparePr = {
  exerciseId: string;
  name: string;
  kind: string;
  you: { weight: number; reps: number; volume: number };
  them: { weight: number; reps: number; volume: number };
};

export const saveComparePrefs = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: Partial<ComparePrefs>) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "compare-prefs", 30);
    await sql`
      update profiles set
        compare_enabled = coalesce(${data.enabled ?? null}, compare_enabled),
        compare_workouts = coalesce(${data.workouts ?? null}, compare_workouts),
        compare_days = coalesce(${data.days ?? null}, compare_days),
        compare_streak = coalesce(${data.streak ?? null}, compare_streak),
        compare_sets = coalesce(${data.sets ?? null}, compare_sets),
        compare_volume = coalesce(${data.volume ?? null}, compare_volume),
        compare_exercises = coalesce(${data.exercises ?? null}, compare_exercises),
        compare_prs = coalesce(${data.prs ?? null}, compare_prs),
        updated_at = now()
      where user_id = ${context.userId}
    `;
    return loadPrefs(sql, context.userId);
  });

export const listComparableFriends = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ready(sql);
    const prefs = await loadPrefs(sql, context.userId);
    const rows = await sql<AnyRow>`
      select p.user_id, p.username, p.display_name, p.image
      from follows f
      join follows back
        on back.follower_id = f.following_id
       and back.following_id = f.follower_id
       and back.status = 'accepted'
      join profiles p on p.user_id = f.following_id
      where f.follower_id = ${context.userId}
        and f.status = 'accepted'
        and p.username is not null
        and p.user_id <> ${context.userId}
        and not exists (
          select 1 from user_blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
        )
      order by lower(p.username)
      limit 80
    `;
    const friends: CompareFriend[] = rows
      .filter((r) => r.username)
      .map((r) => ({
        userId: String(r.user_id),
        username: String(r.username),
        handle: formatHandle(String(r.username)),
        name: String(r.display_name ?? "Atleta"),
        image: r.image ? String(r.image) : null,
      }));
    return { enabled: prefs.enabled, friends };
  });

export const getCompare = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { username: string; period?: ComparePeriod }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "compare", 40);
    const period = parseComparePeriod(data.period);
    const username = normalizeUsername(data.username);
    if (!username) throw socialError(422, "Elige a un amigo para comparar.");

    const friendRow = (await sql<AnyRow>`
      select user_id, username, display_name, image, units,
             compare_enabled, compare_workouts, compare_days, compare_streak,
             compare_sets, compare_volume, compare_exercises, compare_prs
      from profiles
      where lower(username) = ${username}
      limit 1
    `)[0];
    if (!friendRow) throw socialError(404, "No se puede comparar con esta cuenta.");
    const friendId = String(friendRow.user_id);
    if (friendId === context.userId) throw socialError(422, "Elige a un amigo para comparar.");

    const viewerRow = (await sql<AnyRow>`
      select username, display_name, image, units,
             compare_enabled, compare_workouts, compare_days, compare_streak,
             compare_sets, compare_volume, compare_exercises, compare_prs
      from profiles where user_id = ${context.userId}
    `)[0];

    const blocked = await isBlockedEitherWay(sql, context.userId, friendId);
    const outgoing = await followStatus(sql, context.userId, friendId);
    const incoming = await followStatus(sql, friendId, context.userId);
    const viewerPrefs = mapPrefs(viewerRow);
    const friendPrefs = mapPrefs(friendRow);
    const gate = compareAccess({
      viewerEnabled: viewerPrefs.enabled,
      friendEnabled: friendPrefs.enabled,
      mutualAccepted: outgoing === "accepted" && incoming === "accepted",
      blocked,
      isSelf: false,
    });
    if (gate === "viewer_off") {
      throw socialError(403, "Activa las comparativas en Privacidad para comparar con amigos.");
    }
    if (gate !== "ok") throw socialError(404, "No se puede comparar con esta cuenta.");

    const visible = sharedMetrics(viewerPrefs, friendPrefs);
    const fromIso = periodOrigin(period).toISOString();
    const needTotals = visible.some((m) => m === "workouts" || m === "days" || m === "sets" || m === "volume");
    const needStreak = visible.includes("streak");
    const needEx = visible.includes("exercises");
    const needPrs = visible.includes("prs");

    const [youTotals, themTotals, youStreak, themStreak, youEx, themEx, youPrs, themPrs] = await Promise.all([
      needTotals ? periodTotals(sql, context.userId, fromIso) : Promise.resolve(null),
      needTotals ? periodTotals(sql, friendId, fromIso) : Promise.resolve(null),
      needStreak ? currentStreak(sql, context.userId) : Promise.resolve(0),
      needStreak ? currentStreak(sql, friendId) : Promise.resolve(0),
      needEx ? periodExercises(sql, context.userId, fromIso) : Promise.resolve([] as ExRow[]),
      needEx ? periodExercises(sql, friendId, fromIso) : Promise.resolve([] as ExRow[]),
      needPrs ? periodPrs(sql, context.userId, fromIso) : Promise.resolve([] as PrRow[]),
      needPrs ? periodPrs(sql, friendId, fromIso) : Promise.resolve([] as PrRow[]),
    ]);

    const pick = (side: Totals | null, streak: number): CompareSide => {
      const out: CompareSide = {};
      if (visible.includes("workouts")) out.workouts = side?.workouts ?? 0;
      if (visible.includes("days")) out.days = side?.days ?? 0;
      if (visible.includes("streak")) out.streak = streak;
      if (visible.includes("sets")) out.sets = side?.sets ?? 0;
      if (visible.includes("volume")) out.volume = side?.volume ?? 0;
      return out;
    };

    const themExBy = new Map(themEx.map((e) => [e.exerciseId, e]));
    const exercises: CompareExercise[] = [];
    if (needEx) {
      for (const row of youEx) {
        const other = themExBy.get(row.exerciseId);
        if (!other) continue;
        exercises.push({
          exerciseId: row.exerciseId,
          name: row.name,
          muscle: row.muscle,
          you: { sets: row.sets, volume: row.volume, bestWeight: row.bestWeight },
          them: { sets: other.sets, volume: other.volume, bestWeight: other.bestWeight },
        });
      }
      exercises.sort((a, b) => a.name.localeCompare(b.name, "es"));
    }

    const themPrBy = new Map(themPrs.map((p) => [prKey(p.exerciseId, p.kind), p]));
    const prs: ComparePr[] = [];
    if (needPrs) {
      for (const row of youPrs) {
        const other = themPrBy.get(prKey(row.exerciseId, row.kind));
        if (!other) continue;
        prs.push({
          exerciseId: row.exerciseId,
          name: row.name,
          kind: row.kind,
          you: { weight: row.weight, reps: row.reps, volume: row.volume },
          them: { weight: other.weight, reps: other.reps, volume: other.volume },
        });
      }
      prs.sort((a, b) => a.name.localeCompare(b.name, "es") || a.kind.localeCompare(b.kind));
    }

    const viewerUsername = viewerRow?.username ? String(viewerRow.username) : null;
    const friendUsername = String(friendRow.username);
    return {
      period,
      since: fromIso,
      visible,
      you: {
        username: viewerUsername,
        handle: formatHandle(viewerUsername),
        name: String(viewerRow?.display_name ?? "Tú"),
        image: viewerRow?.image ? String(viewerRow.image) : null,
        units: viewerRow?.units === "imperial" ? ("imperial" as const) : ("metric" as const),
        ...pick(youTotals, youStreak),
      },
      friend: {
        username: friendUsername,
        handle: formatHandle(friendUsername),
        name: String(friendRow.display_name ?? "Atleta"),
        image: friendRow.image ? String(friendRow.image) : null,
        ...pick(themTotals, themStreak),
      },
      exercises,
      prs,
    };
  });


