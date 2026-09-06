import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { nid, toIso } from "@/lib/utils";
import { normalizeMuscle } from "./exercise-meta";
import { isDemoUserId } from "./seed-flags";
import { ensurePulseV6, ensurePulseV7 } from "./seed";
import {
  COMMENT_MAX,
  decodeCursor,
  encodeCursor,
  formatHandle,
  isUniqueViolation,
  normalizeUsername,
  parseFeedKind,
  parseReportReason,
  parseReportTarget,
  parseVisibility,
  parseWorkoutVisibility,
  rateLimit,
  sanitizeSearchQuery,
  sanitizeSocialText,
  socialError,
  TEXT_POST_MAX,
  validateBio,
  validateDisplayName,
  validateUsername,
  type FeedKind,
  type FollowStatus,
  type ProfileVisibility,
  type ReportTarget,
  type WorkoutVisibility,
} from "./social";

type AnyRow = Record<string, any>;

function num(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function bool(v: unknown) {
  return v === true || v === "t" || v === "true";
}
function iso(v: unknown) {
  return toIso(v as string | Date | null | undefined) ?? "";
}

async function ready(sql: Sql) {
  await ensurePulseV6(sql);
  await ensurePulseV7(sql);
}

function followStatusOf(v: unknown): FollowStatus | null {
  if (v === "accepted" || v === "pending") return v;
  return null;
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

async function getFollowRow(sql: Sql, followerId: string, followingId: string) {
  const rows = await sql<AnyRow>`
    select status from follows
    where follower_id = ${followerId} and following_id = ${followingId}
    limit 1
  `;
  return followStatusOf(rows[0]?.status);
}

export type PersonCard = {
  userId: string;
  username: string | null;
  handle: string;
  name: string;
  image: string | null;
  bio: string | null;
  profileVisibility: ProfileVisibility;
  followStatus: FollowStatus | null;
  incomingStatus: FollowStatus | null;
};

export type RoutinePeek = {
  id: string | null;
  name: string;
  exerciseCount: number;
  exercises: { name: string; muscle?: string; sets: number; reps: string }[];
};

export type FeedPost = {
  id: string;
  authorId: string;
  username: string | null;
  handle: string;
  name: string;
  image: string | null;
  createdAt: string;
  kind: FeedKind;
  title: string;
  body: string | null;
  durationSeconds: number | null;
  exerciseCount: number | null;
  setCount: number | null;
  muscles: string[];
  volume: number | null;
  prLabel: string | null;
  visibility: WorkoutVisibility;
  liked: boolean;
  likeCount: number;
  commentCount: number;
  mine: boolean;
  routine: RoutinePeek | null;
};

function parseRoutineStructure(raw: unknown): RoutinePeek["exercises"] {
  if (!raw) return [];
  try {
    const v = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(v)) return [];
    return v.slice(0, 24).map((item) => {
      const row = item as Record<string, unknown>;
      return {
        name: String(row.name ?? "Ejercicio"),
        muscle: row.muscle ? String(row.muscle) : undefined,
        sets: num(row.sets) || 0,
        reps: String(row.reps ?? ""),
      };
    });
  } catch {
    return [];
  }
}

function mapPerson(r: AnyRow, viewerId: string): PersonCard {
  const username = r.username ? String(r.username) : null;
  return {
    userId: String(r.user_id),
    username,
    handle: formatHandle(username),
    name: String(r.display_name ?? "Atleta"),
    image: r.image ? String(r.image) : null,
    bio: r.bio ? String(r.bio) : null,
    profileVisibility: parseVisibility(r.profile_visibility) === "public" || bool(r.public_profile) ? "public" : "private",
    followStatus: followStatusOf(r.follow_status),
    incomingStatus: r.user_id === viewerId ? null : followStatusOf(r.incoming_status),
  };
}

function mapPost(r: AnyRow, viewerId: string): FeedPost {
  const vis = parseWorkoutVisibility(r.visibility);
  const kind = parseFeedKind(r.kind);
  const username = r.username ? String(r.username) : null;
  const muscles = String(r.muscles ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const detail = r.detail == null ? "" : String(r.detail);
  const body = kind === "text" ? detail || String(r.title || "") : null;
  const exercises = kind === "routine" ? parseRoutineStructure(detail) : [];
  return {
    id: String(r.id),
    authorId: String(r.user_id),
    username,
    handle: formatHandle(username),
    name: String(r.display_name ?? "Atleta"),
    image: r.image ? String(r.image) : null,
    createdAt: iso(r.created_at),
    kind,
    title: String(r.title || (kind === "text" ? "Publicación" : kind === "routine" ? "Rutina" : "Entrenamiento libre")),
    body,
    durationSeconds: r.duration_seconds == null ? null : num(r.duration_seconds),
    exerciseCount: r.exercise_count == null ? null : num(r.exercise_count),
    setCount: r.set_count == null ? null : num(r.set_count),
    muscles,
    volume: bool(r.share_volume) ? num(r.volume) : null,
    prLabel: bool(r.share_prs) && r.pr_label ? String(r.pr_label) : null,
    visibility: vis,
    liked: bool(r.liked),
    likeCount: num(r.like_count),
    commentCount: num(r.comment_count),
    mine: r.user_id === viewerId,
    routine:
      kind === "routine"
        ? {
            id: r.routine_id ? String(r.routine_id) : null,
            name: String(r.title || "Rutina"),
            exerciseCount: r.exercise_count == null ? exercises.length : num(r.exercise_count),
            exercises,
          }
        : null,
  };
}

export const saveSocialProfile = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    displayName?: string;
    username?: string;
    bio?: string;
    profileVisibility?: ProfileVisibility;
    defaultWorkoutVisibility?: WorkoutVisibility;
    shareVolume?: boolean;
    sharePrs?: boolean;
  }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "profile", 20);
    const displayName = data.displayName != null ? validateDisplayName(data.displayName) : null;
    const username = data.username != null && data.username.trim() ? validateUsername(data.username) : null;
    const bio = data.bio != null ? validateBio(data.bio) : null;
    const vis = data.profileVisibility ? parseVisibility(data.profileVisibility) : null;
    const workoutVis = data.defaultWorkoutVisibility ? parseWorkoutVisibility(data.defaultWorkoutVisibility) : null;
    try {
      await sql`
        update profiles set
          display_name = coalesce(${displayName}, display_name),
          username = coalesce(${username}, username),
          bio = coalesce(${bio}, bio),
          profile_visibility = coalesce(${vis}, profile_visibility),
          public_profile = coalesce(${vis == null ? null : vis === "public"}, public_profile),
          default_workout_visibility = coalesce(${workoutVis}, default_workout_visibility),
          share_volume = coalesce(${data.shareVolume ?? null}, share_volume),
          share_prs = coalesce(${data.sharePrs ?? null}, share_prs),
          updated_at = now()
        where user_id = ${context.userId}
      `;
    } catch (err) {
      if (isUniqueViolation(err)) throw socialError(409, "Ese @usuario ya está en uso.");
      throw err;
    }
    const row = (await sql<AnyRow>`select * from profiles where user_id = ${context.userId}`)[0];
    return {
      username: row?.username ? String(row.username) : null,
      handle: formatHandle(row?.username),
      displayName: row?.display_name ? String(row.display_name) : "Atleta",
      bio: row?.bio ? String(row.bio) : "",
      profileVisibility: parseVisibility(row?.profile_visibility),
      defaultWorkoutVisibility: parseWorkoutVisibility(row?.default_workout_visibility),
      shareVolume: bool(row?.share_volume),
      sharePrs: bool(row?.share_prs),
      image: row?.image ? String(row.image) : null,
    };
  });

export const searchPeople = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { q: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "search", 20);
    const q = sanitizeSearchQuery(data.q);
    if (q.length < 1) return { people: [] as PersonCard[] };
    const needle = q.toLowerCase();
    const rows = await sql<AnyRow>`
      select p.user_id, p.username, p.display_name, p.image, p.bio, p.profile_visibility, p.public_profile,
        (select f.status from follows f where f.follower_id = ${context.userId} and f.following_id = p.user_id) as follow_status,
        (select f.status from follows f where f.follower_id = p.user_id and f.following_id = ${context.userId}) as incoming_status
      from profiles p
      where p.user_id <> ${context.userId}
        and p.username is not null
        and p.onboarding_done = true
        and p.user_id not like ${"pulse-demo-%"}
        and (
          strpos(lower(p.username), ${needle}) > 0
          or strpos(lower(coalesce(p.display_name, '')), ${needle}) > 0
        )
        and not exists (
          select 1 from user_blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
        )
      order by
        case when lower(p.username) = ${q.toLowerCase()} then 0 else 1 end,
        p.display_name
      limit 20
    `;
    return { people: rows.map((r) => mapPerson(r, context.userId)) };
  });

export const followUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "follow", 30);
    const target = String(data.userId ?? "");
    if (!target || target === context.userId) throw socialError(422, "No puedes seguirte a ti mismo.");
    if (isDemoUserId(target)) throw socialError(404, "No se ha encontrado este perfil.");
    if (await isBlockedEitherWay(sql, context.userId, target)) {
      throw socialError(403, "No puedes seguir a esta cuenta.");
    }
    const profile = (await sql<AnyRow>`
      select user_id, profile_visibility, public_profile from profiles where user_id = ${target}
    `)[0];
    if (!profile) throw socialError(404, "No se ha encontrado este perfil.");
    const isPublic = parseVisibility(profile.profile_visibility) === "public" || bool(profile.public_profile);
    const existing = await getFollowRow(sql, context.userId, target);
    if (existing === "accepted") return { status: "accepted" as FollowStatus };
    const status: FollowStatus = isPublic ? "accepted" : "pending";
    await sql`
      insert into follows (follower_id, following_id, status)
      values (${context.userId}, ${target}, ${status})
      on conflict (follower_id, following_id) do update set status = excluded.status
    `;
    return { status };
  });

export const unfollowUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "follow", 30);
    await sql`delete from follows where follower_id = ${context.userId} and following_id = ${data.userId}`;
    return { status: null };
  });

export const cancelFollowRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "request", 20);
    await sql`
      delete from follows
      where follower_id = ${context.userId} and following_id = ${data.userId} and status = 'pending'
    `;
    return { status: null };
  });

export const acceptFollowRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "request", 20);
    const updated = await sql<AnyRow>`
      update follows set status = 'accepted'
      where follower_id = ${data.userId} and following_id = ${context.userId} and status = 'pending'
      returning follower_id
    `;
    if (!updated[0]) throw socialError(404, "No hay ninguna solicitud pendiente.");
    return { status: "accepted" as FollowStatus };
  });

export const rejectFollowRequest = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "request", 20);
    await sql`
      delete from follows
      where follower_id = ${data.userId} and following_id = ${context.userId} and status = 'pending'
    `;
    return { ok: true };
  });

export const removeFollower = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "follow", 30);
    const me = (await sql<AnyRow>`select profile_visibility, public_profile from profiles where user_id = ${context.userId}`)[0];
    const isPublic = parseVisibility(me?.profile_visibility) === "public" || bool(me?.public_profile);
    if (isPublic) throw socialError(403, "Solo los perfiles privados pueden eliminar seguidores.");
    await sql`
      delete from follows
      where follower_id = ${data.userId} and following_id = ${context.userId} and status = 'accepted'
    `;
    return { ok: true };
  });

export const listFollowRequests = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ready(sql);
    const rows = await sql<AnyRow>`
      select p.user_id, p.username, p.display_name, p.image, p.bio, p.profile_visibility, p.public_profile,
        'pending'::text as incoming_status, null as follow_status
      from follows f
      join profiles p on p.user_id = f.follower_id
      where f.following_id = ${context.userId} and f.status = 'pending'
      order by f.created_at desc
      limit 50
    `;
    return { people: rows.map((r) => mapPerson(r, context.userId)) };
  });

export const getActivityFeed = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { cursor?: string | null } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    const cursor = decodeCursor(data.cursor);
    const rows = await sql<AnyRow>`
      select a.id, a.user_id, a.kind, a.title, a.detail, a.created_at, a.visibility, a.volume, a.duration_seconds,
        a.share_volume, a.share_prs, a.exercise_count, a.set_count, a.muscles, a.pr_label, a.routine_id,
        p.display_name, p.image, p.username,
        exists(select 1 from feed_likes l where l.feed_id = a.id and l.user_id = ${context.userId}) as liked,
        (select count(*)::int from feed_likes l where l.feed_id = a.id) as like_count,
        (select count(*)::int from feed_comments c where c.feed_id = a.id and c.deleted_at is null) as comment_count
      from activity_feed a
      join profiles p on p.user_id = a.user_id
      where a.deleted_at is null
        and a.kind in ('workout', 'text', 'routine')
        and a.visibility in ('followers', 'public')
        and a.user_id not like ${"pulse-demo-%"}
        and (
          a.user_id = ${context.userId}
          or a.user_id in (
            select following_id from follows
            where follower_id = ${context.userId} and status = 'accepted'
          )
        )
        and not exists (
          select 1 from hidden_posts h where h.user_id = ${context.userId} and h.post_id = a.id
        )
        and not exists (
          select 1 from user_blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = a.user_id)
             or (b.blocker_id = a.user_id and b.blocked_id = ${context.userId})
        )
        and (
          ${cursor?.createdAt ?? null}::timestamptz is null
          or a.created_at < ${cursor?.createdAt ?? null}::timestamptz
          or (a.created_at = ${cursor?.createdAt ?? null}::timestamptz and a.id < ${cursor?.id ?? null})
        )
      order by a.created_at desc, a.id desc
      limit 21
    `;
    const page = rows.slice(0, 20);
    const extra = rows[20];
    const following = await sql<AnyRow>`
      select count(*)::int as n from follows
      where follower_id = ${context.userId} and status = 'accepted'
        and following_id not like ${"pulse-demo-%"}
        and not exists (
          select 1 from user_blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = follows.following_id)
             or (b.blocker_id = follows.following_id and b.blocked_id = ${context.userId})
        )
    `;
    const pending = await sql<AnyRow>`
      select count(*)::int as n from follows
      where following_id = ${context.userId} and status = 'pending'
    `;
    const me = (await sql<AnyRow>`select username from profiles where user_id = ${context.userId}`)[0];
    const last = page[page.length - 1];
    return {
      items: page.map((r) => mapPost(r, context.userId)),
      nextCursor: extra && last ? encodeCursor(iso(last.created_at), String(last.id)) : null,
      followingCount: num(following[0]?.n),
      pendingIncoming: num(pending[0]?.n),
      username: me?.username ? String(me.username) : null,
    };
  });

async function workoutStats(sql: Sql, userId: string, workoutId: string, sharePrs: boolean) {
  const w = (await sql<AnyRow>`
    select id, title, duration_seconds, started_at
    from workouts
    where id = ${workoutId} and user_id = ${userId} and status = 'completed'
  `)[0];
  if (!w) throw socialError(404, "Entrenamiento no encontrado.");
  const sets = await sql<AnyRow>`
    select s.exercise_id, s.weight, s.reps, s.completed, e.name, e.muscle
    from workout_sets s
    join exercises e on e.id = s.exercise_id
    where s.workout_id = ${workoutId}
  `;
  const done = sets.filter((s) => bool(s.completed));
  const exerciseIds = new Set(done.map((s) => String(s.exercise_id)));
  const muscles = [
    ...new Set(done.map((s) => String(normalizeMuscle(s.muscle) || s.muscle || "")).filter(Boolean)),
  ];
  const volume = done.reduce((sum, s) => sum + num(s.weight) * num(s.reps), 0);
  let prLabel: string | null = null;
  if (sharePrs) {
    const started = iso(w.started_at) || new Date(0).toISOString();
    const prs = await sql<AnyRow>`
      select distinct e.name
      from personal_records pr
      join exercises e on e.id = pr.exercise_id
      where pr.user_id = ${userId}
        and pr.recorded_at >= ${started}::timestamptz
        and pr.exercise_id in (select exercise_id from workout_sets where workout_id = ${workoutId})
      limit 4
    `;
    if (prs.length) prLabel = `PR: ${prs.map((p) => String(p.name)).join(", ")}`;
  }
  return {
    title: String(w.title || "Entrenamiento libre"),
    durationSeconds: w.duration_seconds == null ? null : num(w.duration_seconds),
    exerciseCount: exerciseIds.size,
    setCount: done.length,
    muscles: muscles.join(","),
    volume,
    prLabel,
  };
}

export const shareWorkout = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: {
    workoutId: string;
    visibility: WorkoutVisibility;
    shareVolume?: boolean;
    sharePrs?: boolean;
  }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "post", 20);
    const visibility = parseWorkoutVisibility(data.visibility);
    const existing = (await sql<AnyRow>`
      select id from activity_feed
      where user_id = ${context.userId} and workout_id = ${data.workoutId} and deleted_at is null
      order by created_at desc
      limit 1
    `)[0];
    if (visibility === "me") {
      if (existing) {
        await sql`update activity_feed set deleted_at = now() where id = ${existing.id} and user_id = ${context.userId}`;
      }
      return { posted: false, id: null as string | null };
    }
    const prefs = (await sql<AnyRow>`
      select share_volume, share_prs from profiles where user_id = ${context.userId}
    `)[0];
    const shareVolume = data.shareVolume ?? bool(prefs?.share_volume);
    const sharePrs = data.sharePrs ?? bool(prefs?.share_prs);
    const stats = await workoutStats(sql, context.userId, data.workoutId, sharePrs);
    if (existing) {
      await sql`
        update activity_feed set
          visibility = ${visibility},
          title = ${stats.title},
          volume = ${stats.volume},
          duration_seconds = ${stats.durationSeconds},
          share_volume = ${shareVolume},
          share_prs = ${sharePrs},
          exercise_count = ${stats.exerciseCount},
          set_count = ${stats.setCount},
          muscles = ${stats.muscles},
          pr_label = ${stats.prLabel},
          kind = 'workout',
          deleted_at = null
        where id = ${existing.id} and user_id = ${context.userId}
      `;
      return { posted: true, id: String(existing.id) };
    }
    const id = nid();
    await sql`
      insert into activity_feed (
        id, user_id, kind, title, workout_id, volume, duration_seconds, visibility,
        share_volume, share_prs, exercise_count, set_count, muscles, pr_label
      ) values (
        ${id}, ${context.userId}, 'workout', ${stats.title}, ${data.workoutId}, ${stats.volume},
        ${stats.durationSeconds}, ${visibility}, ${shareVolume}, ${sharePrs},
        ${stats.exerciseCount}, ${stats.setCount}, ${stats.muscles}, ${stats.prLabel}
      )
    `;
    return { posted: true, id };
  });

export const updatePostVisibility = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string; visibility: WorkoutVisibility }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "post", 20);
    const vis = parseWorkoutVisibility(data.visibility);
    const row = (await sql<AnyRow>`
      select id, kind from activity_feed where id = ${data.postId} and user_id = ${context.userId} and deleted_at is null
    `)[0];
    if (!row) throw socialError(404, "No se ha encontrado esta publicación.");
    if (vis === "me" && parseFeedKind(row.kind) === "workout") {
      await sql`update activity_feed set deleted_at = now() where id = ${data.postId} and user_id = ${context.userId}`;
      return { deleted: true, visibility: "me" as const };
    }
    await sql`
      update activity_feed set visibility = ${vis}, deleted_at = null
      where id = ${data.postId} and user_id = ${context.userId}
    `;
    return { deleted: false, visibility: vis };
  });

export const deleteSocialPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "post", 20);
    const row = (await sql<AnyRow>`
      select id from activity_feed where id = ${data.postId} and user_id = ${context.userId}
    `)[0];
    if (!row) throw socialError(404, "No se ha encontrado esta publicación.");
    await sql`update activity_feed set deleted_at = now() where id = ${data.postId} and user_id = ${context.userId}`;
    return { ok: true };
  });

async function assertCanSeePost(sql: Sql, viewerId: string, postId: string) {
  const row = (await sql<AnyRow>`
    select a.id, a.user_id, a.visibility, a.deleted_at, p.profile_visibility, p.public_profile
    from activity_feed a
    join profiles p on p.user_id = a.user_id
    where a.id = ${postId}
  `)[0];
  if (!row || row.deleted_at) throw socialError(404, "No se ha encontrado esta publicación.");
  if (row.user_id === viewerId) return row;
  if (await isBlockedEitherWay(sql, viewerId, String(row.user_id))) {
    throw socialError(404, "No se ha encontrado esta publicación.");
  }
  const hidden = (await sql<AnyRow>`
    select 1 from hidden_posts where user_id = ${viewerId} and post_id = ${postId}
  `)[0];
  if (hidden) throw socialError(404, "No se ha encontrado esta publicación.");
  const vis = parseWorkoutVisibility(row.visibility);
  if (vis === "me") throw socialError(404, "No se ha encontrado esta publicación.");
  const follow = await getFollowRow(sql, viewerId, String(row.user_id));
  const profilePublic = parseVisibility(row.profile_visibility) === "public" || bool(row.public_profile);
  if (!profilePublic && follow !== "accepted") throw socialError(404, "No se ha encontrado esta publicación.");
  if (vis === "followers" && follow !== "accepted") throw socialError(404, "No se ha encontrado esta publicación.");
  return row;
}

export const togglePostLike = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "like", 60);
    await assertCanSeePost(sql, context.userId, data.postId);
    const existing = (await sql<AnyRow>`
      select 1 from feed_likes where feed_id = ${data.postId} and user_id = ${context.userId}
    `)[0];
    if (existing) {
      await sql`delete from feed_likes where feed_id = ${data.postId} and user_id = ${context.userId}`;
      return { liked: false };
    }
    await sql`insert into feed_likes (feed_id, user_id) values (${data.postId}, ${context.userId}) on conflict do nothing`;
    return { liked: true };
  });

export const hidePost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "hide", 30);
    const row = (await sql<AnyRow>`select user_id from activity_feed where id = ${data.postId}`)[0];
    if (!row) throw socialError(404, "No se ha encontrado esta publicación.");
    if (row.user_id === context.userId) throw socialError(422, "No puedes ocultar tu propia publicación.");
    await sql`
      insert into hidden_posts (user_id, post_id) values (${context.userId}, ${data.postId})
      on conflict do nothing
    `;
    return { ok: true };
  });

export const reportContent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { targetType: ReportTarget; targetId: string; reason: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "report", 10);
    const reason = parseReportReason(data.reason);
    const targetType = parseReportTarget(data.targetType);
    const targetId = String(data.targetId ?? "");
    if (!targetId) throw socialError(422, "Falta el contenido a reportar.");
    if (targetType === "user" && targetId === context.userId) throw socialError(422, "No puedes reportarte a ti mismo.");
    if (targetType === "post") {
      const post = (await sql<AnyRow>`select user_id from activity_feed where id = ${targetId}`)[0];
      if (!post) throw socialError(404, "No se ha encontrado esta publicación.");
      if (post.user_id === context.userId) throw socialError(422, "No puedes reportar tu propia publicación.");
    }
    if (targetType === "comment") {
      const comment = (await sql<AnyRow>`
        select id, user_id, feed_id, deleted_at from feed_comments where id = ${targetId}
      `)[0];
      if (!comment || comment.deleted_at) throw socialError(404, "No se ha encontrado este comentario.");
      if (comment.user_id === context.userId) throw socialError(422, "No puedes reportar tu propio comentario.");
      await assertCanSeePost(sql, context.userId, String(comment.feed_id));
    }
    try {
      await sql`
        insert into reports (id, reporter_id, target_type, target_id, reason, status)
        values (${nid()}, ${context.userId}, ${targetType}, ${targetId}, ${reason}, 'pending')
      `;
    } catch (err) {
      if (isUniqueViolation(err)) throw socialError(409, "Ya has reportado esto.");
      throw err;
    }
    return { ok: true };
  });

export const blockUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "block", 20);
    const target = String(data.userId ?? "");
    if (!target || target === context.userId) throw socialError(422, "No puedes bloquearte a ti mismo.");
    await sql`
      insert into user_blocks (blocker_id, blocked_id)
      values (${context.userId}, ${target})
      on conflict do nothing
    `;
    await sql`
      delete from follows
      where (follower_id = ${context.userId} and following_id = ${target})
         or (follower_id = ${target} and following_id = ${context.userId})
    `;
    return { ok: true };
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { userId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "block", 20);
    await sql`delete from user_blocks where blocker_id = ${context.userId} and blocked_id = ${data.userId}`;
    return { ok: true };
  });

export const listBlockedUsers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const sql = await getSql();
    await ready(sql);
    const rows = await sql<AnyRow>`
      select p.user_id, p.username, p.display_name, p.image, b.created_at
      from user_blocks b
      join profiles p on p.user_id = b.blocked_id
      where b.blocker_id = ${context.userId}
      order by b.created_at desc
    `;
    return {
      people: rows.map((r) => ({
        userId: String(r.user_id),
        username: r.username ? String(r.username) : null,
        handle: formatHandle(r.username),
        name: String(r.display_name ?? "Atleta"),
        image: r.image ? String(r.image) : null,
      })),
    };
  });

export const getSocialProfile = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { username: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    const username = normalizeUsername(data.username);
    if (!username) throw socialError(422, "El @usuario no es válido.");
    const p = (await sql<AnyRow>`
      select p.user_id, p.username, p.display_name, p.image, p.bio, p.profile_visibility, p.public_profile
      from profiles p
      where lower(p.username) = ${username}
      limit 1
    `)[0];
    if (!p) throw socialError(404, "No se ha encontrado este perfil.");
    const userId = String(p.user_id);
    if (await isBlockedEitherWay(sql, context.userId, userId)) {
      throw socialError(404, "No se ha encontrado este perfil.");
    }
    const mine = userId === context.userId;
    const followStatus = mine ? null : await getFollowRow(sql, context.userId, userId);
    const incomingStatus = mine ? null : await getFollowRow(sql, userId, context.userId);
    const profileVisibility: ProfileVisibility =
      parseVisibility(p.profile_visibility) === "public" || bool(p.public_profile) ? "public" : "private";
    const locked = !mine && profileVisibility === "private" && followStatus !== "accepted";
    const followers = await sql<AnyRow>`
      select count(*)::int as n from follows where following_id = ${userId} and status = 'accepted'
    `;
    const following = await sql<AnyRow>`
      select count(*)::int as n from follows where follower_id = ${userId} and status = 'accepted'
    `;
    let posts: FeedPost[] = [];
    if (!locked) {
      const rows = await sql<AnyRow>`
        select a.id, a.user_id, a.kind, a.title, a.detail, a.created_at, a.visibility, a.volume, a.duration_seconds,
          a.share_volume, a.share_prs, a.exercise_count, a.set_count, a.muscles, a.pr_label, a.routine_id,
          p.display_name, p.image, p.username,
          exists(select 1 from feed_likes l where l.feed_id = a.id and l.user_id = ${context.userId}) as liked,
          (select count(*)::int from feed_likes l where l.feed_id = a.id) as like_count,
          (select count(*)::int from feed_comments c where c.feed_id = a.id and c.deleted_at is null) as comment_count
        from activity_feed a
        join profiles p on p.user_id = a.user_id
        where a.user_id = ${userId}
          and a.deleted_at is null
          and a.kind in ('workout', 'text', 'routine')
          and not exists (
            select 1 from hidden_posts h where h.user_id = ${context.userId} and h.post_id = a.id
          )
          and (
            ${mine} and a.visibility in ('me', 'followers', 'public')
            or a.visibility = 'public'
            or (${followStatus === "accepted"} and a.visibility = 'followers')
          )
        order by a.created_at desc
        limit 30
      `;
      posts = rows.map((r) => mapPost(r, context.userId));
    }
    return {
      userId,
      mine,
      locked,
      username,
      handle: formatHandle(username),
      name: String(p.display_name ?? "Atleta"),
      image: p.image ? String(p.image) : null,
      bio: p.bio ? String(p.bio) : "",
      profileVisibility,
      followStatus,
      incomingStatus,
      followerCount: locked ? null : num(followers[0]?.n),
      followingCount: locked ? null : num(following[0]?.n),
      posts,
    };
  });

export const listFollowers = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { username?: string } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    let userId = context.userId;
    if (data.username) {
      const u = validateUsername(data.username);
      const row = (await sql<AnyRow>`select user_id from profiles where lower(username) = ${u}`)[0];
      if (!row) throw socialError(404, "No se ha encontrado este perfil.");
      userId = String(row.user_id);
      if (userId !== context.userId) {
        const vis = (await sql<AnyRow>`select profile_visibility, public_profile from profiles where user_id = ${userId}`)[0];
        const isPublic = parseVisibility(vis?.profile_visibility) === "public" || bool(vis?.public_profile);
        const follow = await getFollowRow(sql, context.userId, userId);
        if (!isPublic && follow !== "accepted") throw socialError(403, "Este perfil es privado.");
      }
    }
    const rows = await sql<AnyRow>`
      select p.user_id, p.username, p.display_name, p.image, p.bio, p.profile_visibility, p.public_profile,
        (select f.status from follows f where f.follower_id = ${context.userId} and f.following_id = p.user_id) as follow_status,
        f.status as incoming_status
      from follows f
      join profiles p on p.user_id = f.follower_id
      where f.following_id = ${userId} and f.status = 'accepted'
        and not exists (
          select 1 from user_blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = p.user_id)
             or (b.blocker_id = p.user_id and b.blocked_id = ${context.userId})
        )
      order by f.created_at desc
      limit 50
    `;
    return { people: rows.map((r) => mapPerson(r, context.userId)), mine: userId === context.userId };
  });

export const getDiscoverFeed = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { cursor?: string | null } | undefined) => d ?? {})
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    const cursor = decodeCursor(data.cursor);
    const rows = await sql<AnyRow>`
      select a.id, a.user_id, a.kind, a.title, a.detail, a.created_at, a.visibility, a.volume, a.duration_seconds,
        a.share_volume, a.share_prs, a.exercise_count, a.set_count, a.muscles, a.pr_label, a.routine_id,
        p.display_name, p.image, p.username,
        exists(select 1 from feed_likes l where l.feed_id = a.id and l.user_id = ${context.userId}) as liked,
        (select count(*)::int from feed_likes l where l.feed_id = a.id) as like_count,
        (select count(*)::int from feed_comments c where c.feed_id = a.id and c.deleted_at is null) as comment_count
      from activity_feed a
      join profiles p on p.user_id = a.user_id
      where a.deleted_at is null
        and a.kind in ('workout', 'text', 'routine')
        and a.visibility = 'public'
        and a.user_id not like ${"pulse-demo-%"}
        and (p.profile_visibility = 'public' or p.public_profile = true)
        and not exists (
          select 1 from hidden_posts h where h.user_id = ${context.userId} and h.post_id = a.id
        )
        and not exists (
          select 1 from user_blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = a.user_id)
             or (b.blocker_id = a.user_id and b.blocked_id = ${context.userId})
        )
        and (
          ${cursor?.createdAt ?? null}::timestamptz is null
          or a.created_at < ${cursor?.createdAt ?? null}::timestamptz
          or (a.created_at = ${cursor?.createdAt ?? null}::timestamptz and a.id < ${cursor?.id ?? null})
        )
      order by a.created_at desc, a.id desc
      limit 21
    `;
    const page = rows.slice(0, 20);
    const extra = rows[20];
    const last = page[page.length - 1];
    return {
      items: page.map((r) => mapPost(r, context.userId)),
      nextCursor: extra && last ? encodeCursor(iso(last.created_at), String(last.id)) : null,
    };
  });

export const createTextPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { body: string; visibility: WorkoutVisibility }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "post", 20);
    const body = sanitizeSocialText(data.body, TEXT_POST_MAX);
    const visibility = parseWorkoutVisibility(data.visibility);
    const title = body.length > 80 ? `${body.slice(0, 77)}…` : body;
    const id = nid();
    await sql`
      insert into activity_feed (id, user_id, kind, title, detail, visibility)
      values (${id}, ${context.userId}, 'text', ${title}, ${body}, ${visibility})
    `;
    return { posted: visibility !== "me", id, visibility };
  });

export const updateTextPost = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "post", 20);
    const body = sanitizeSocialText(data.body, TEXT_POST_MAX);
    const title = body.length > 80 ? `${body.slice(0, 77)}…` : body;
    const row = (await sql<AnyRow>`
      select id from activity_feed
      where id = ${data.postId} and user_id = ${context.userId} and kind = 'text' and deleted_at is null
    `)[0];
    if (!row) throw socialError(404, "No se ha encontrado esta publicación.");
    await sql`
      update activity_feed set title = ${title}, detail = ${body}
      where id = ${data.postId} and user_id = ${context.userId}
    `;
    return { ok: true, body };
  });

export type FeedComment = {
  id: string;
  postId: string;
  authorId: string;
  username: string | null;
  handle: string;
  name: string;
  image: string | null;
  body: string;
  createdAt: string;
  edited: boolean;
  mine: boolean;
  canDelete: boolean;
};

function mapComment(r: AnyRow, viewerId: string, postAuthorId: string): FeedComment {
  const username = r.username ? String(r.username) : null;
  return {
    id: String(r.id),
    postId: String(r.feed_id),
    authorId: String(r.user_id),
    username,
    handle: formatHandle(username),
    name: String(r.display_name ?? "Atleta"),
    image: r.image ? String(r.image) : null,
    body: String(r.body ?? ""),
    createdAt: iso(r.created_at),
    edited: Boolean(r.updated_at),
    mine: r.user_id === viewerId,
    canDelete: r.user_id === viewerId || postAuthorId === viewerId,
  };
}

export const listPostComments = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator((d: { postId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    const post = await assertCanSeePost(sql, context.userId, data.postId);
    const rows = await sql<AnyRow>`
      select c.id, c.feed_id, c.user_id, c.body, c.created_at, c.updated_at,
        p.display_name, p.image, p.username
      from feed_comments c
      join profiles p on p.user_id = c.user_id
      where c.feed_id = ${data.postId}
        and c.deleted_at is null
        and not exists (
          select 1 from user_blocks b
          where (b.blocker_id = ${context.userId} and b.blocked_id = c.user_id)
             or (b.blocker_id = c.user_id and b.blocked_id = ${context.userId})
        )
      order by c.created_at
      limit 80
    `;
    return { comments: rows.map((r) => mapComment(r, context.userId, String(post.user_id))) };
  });

export const addPostComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "comment", 30);
    const post = await assertCanSeePost(sql, context.userId, data.postId);
    const body = sanitizeSocialText(data.body, COMMENT_MAX);
    const id = nid();
    await sql`
      insert into feed_comments (id, feed_id, user_id, body)
      values (${id}, ${data.postId}, ${context.userId}, ${body})
    `;
    const me = (await sql<AnyRow>`select username, display_name, image from profiles where user_id = ${context.userId}`)[0];
    return {
      comment: mapComment(
        {
          id,
          feed_id: data.postId,
          user_id: context.userId,
          body,
          created_at: new Date().toISOString(),
          updated_at: null,
          username: me?.username,
          display_name: me?.display_name,
          image: me?.image,
        },
        context.userId,
        String(post.user_id),
      ),
    };
  });

export const updatePostComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { commentId: string; body: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "comment", 30);
    const body = sanitizeSocialText(data.body, COMMENT_MAX);
    const row = (await sql<AnyRow>`
      select id, feed_id from feed_comments
      where id = ${data.commentId} and user_id = ${context.userId} and deleted_at is null
    `)[0];
    if (!row) throw socialError(404, "No se ha encontrado este comentario.");
    await assertCanSeePost(sql, context.userId, String(row.feed_id));
    await sql`
      update feed_comments set body = ${body}, updated_at = now()
      where id = ${data.commentId} and user_id = ${context.userId}
    `;
    return { ok: true, body };
  });

export const deletePostComment = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { commentId: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "comment", 30);
    const row = (await sql<AnyRow>`
      select c.id, c.user_id, c.feed_id, a.user_id as post_author
      from feed_comments c
      join activity_feed a on a.id = c.feed_id
      where c.id = ${data.commentId} and c.deleted_at is null
    `)[0];
    if (!row) throw socialError(404, "No se ha encontrado este comentario.");
    const allowed = row.user_id === context.userId || row.post_author === context.userId;
    if (!allowed) throw socialError(403, "No puedes borrar este comentario.");
    await sql`
      update feed_comments set deleted_at = now()
      where id = ${data.commentId}
    `;
    return { ok: true };
  });

async function routineSnapshot(sql: Sql, userId: string, routineId: string) {
  const r = (await sql<AnyRow>`
    select id, user_id, name, description, icon, color, is_archived, visibility, is_public
    from routines where id = ${routineId}
  `)[0];
  if (!r || bool(r.is_archived)) throw socialError(404, "Rutina no encontrada.");
  if (String(r.user_id) !== userId) throw socialError(403, "Esta rutina no es tuya.");
  const ex = await sql<AnyRow>`
    select e.name, e.muscle, re.target_sets, re.target_reps
    from routine_exercises re
    join exercises e on e.id = re.exercise_id
    where re.routine_id = ${routineId}
    order by re.sort_order
  `;
  const exercises = ex.map((e) => ({
    name: String(e.name),
    muscle: e.muscle ? String(e.muscle) : undefined,
    sets: num(e.target_sets) || 0,
    reps: String(e.target_reps ?? ""),
  }));
  return {
    id: String(r.id),
    name: String(r.name || "Rutina"),
    exerciseCount: exercises.length,
    exercises,
    detail: JSON.stringify(exercises),
  };
}

export const shareRoutineToFeed = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { routineId: string; visibility: WorkoutVisibility }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "post", 20);
    const visibility = parseWorkoutVisibility(data.visibility);
    const snap = await routineSnapshot(sql, context.userId, data.routineId);
    const isPublic = visibility === "public";
    await sql`
      update routines set
        visibility = ${visibility},
        is_public = ${isPublic},
        share_slug = case
          when ${isPublic} then coalesce(share_slug, ${`${data.routineId.slice(0, 8)}${nid().slice(0, 8)}`})
          else share_slug
        end,
        updated_at = now()
      where id = ${data.routineId} and user_id = ${context.userId}
    `;
    const existing = (await sql<AnyRow>`
      select id from activity_feed
      where user_id = ${context.userId} and routine_id = ${data.routineId} and kind = 'routine' and deleted_at is null
      order by created_at desc
      limit 1
    `)[0];
    if (visibility === "me") {
      if (existing) {
        await sql`update activity_feed set deleted_at = now(), visibility = 'me' where id = ${existing.id} and user_id = ${context.userId}`;
      }
      return { posted: false, id: null as string | null };
    }
    if (existing) {
      await sql`
        update activity_feed set
          title = ${snap.name},
          detail = ${snap.detail},
          exercise_count = ${snap.exerciseCount},
          visibility = ${visibility},
          deleted_at = null
        where id = ${existing.id} and user_id = ${context.userId}
      `;
      return { posted: true, id: String(existing.id) };
    }
    const id = nid();
    await sql`
      insert into activity_feed (id, user_id, kind, title, detail, visibility, routine_id, exercise_count)
      values (${id}, ${context.userId}, 'routine', ${snap.name}, ${snap.detail}, ${visibility}, ${data.routineId}, ${snap.exerciseCount})
    `;
    return { posted: true, id };
  });

async function assertCanCopyRoutine(sql: Sql, viewerId: string, routineId: string) {
  const r = (await sql<AnyRow>`
    select id, user_id, name, description, icon, color, visibility, is_public, is_archived
    from routines where id = ${routineId}
  `)[0];
  if (!r || bool(r.is_archived)) throw socialError(404, "Rutina no encontrada.");
  const ownerId = String(r.user_id);
  if (ownerId === viewerId) return r;
  if (await isBlockedEitherWay(sql, viewerId, ownerId)) {
    throw socialError(404, "Rutina no encontrada.");
  }
  const vis = parseWorkoutVisibility(r.visibility) === "me" && bool(r.is_public) ? "public" : parseWorkoutVisibility(r.visibility);
  if (vis === "me") throw socialError(404, "Rutina no encontrada.");
  const follow = await getFollowRow(sql, viewerId, ownerId);
  const profile = (await sql<AnyRow>`
    select profile_visibility, public_profile from profiles where user_id = ${ownerId}
  `)[0];
  const profilePublic = parseVisibility(profile?.profile_visibility) === "public" || bool(profile?.public_profile);
  if (!profilePublic && follow !== "accepted") throw socialError(404, "Rutina no encontrada.");
  if (vis === "followers" && follow !== "accepted") throw socialError(404, "Rutina no encontrada.");
  return r;
}

export const copySharedRoutine = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((d: { postId?: string; routineId?: string }) => d)
  .handler(async ({ context, data }) => {
    const sql = await getSql();
    await ready(sql);
    rateLimit(context.userId, "copy", 10);
    let routineId = data.routineId ? String(data.routineId) : "";
    if (data.postId) {
      await assertCanSeePost(sql, context.userId, data.postId);
      const row = (await sql<AnyRow>`
        select routine_id, kind, detail, title, exercise_count, user_id
        from activity_feed where id = ${data.postId}
      `)[0];
      if (!row || parseFeedKind(row.kind) !== "routine") {
        throw socialError(422, "Esta publicación no es una rutina.");
      }
      routineId = row.routine_id ? String(row.routine_id) : "";
      if (!routineId) throw socialError(404, "Esta rutina ya no está disponible.");
    }
    if (!routineId) throw socialError(422, "Falta la rutina a copiar.");
    const src = await assertCanCopyRoutine(sql, context.userId, routineId);
    const ownerId = String(src.user_id);
    if (ownerId === context.userId) throw socialError(422, "Esta rutina ya está en tus rutinas.");
    const id = nid();
    await sql`
      insert into routines (id, user_id, name, description, icon, color, visibility, is_public, copied_from_id, copied_from_user_id)
      values (
        ${id}, ${context.userId}, ${String(src.name)}, ${src.description ?? null},
        ${src.icon ?? "dumbbell"}, ${src.color ?? "#FF2D55"}, 'me', false,
        ${routineId}, ${ownerId}
      )
    `;
    const ex = await sql<AnyRow>`
      select exercise_id, sort_order, target_sets, target_reps, rest_seconds
      from routine_exercises where routine_id = ${routineId}
    `;
    for (const e of ex) {
      await sql`
        insert into routine_exercises (id, routine_id, exercise_id, sort_order, target_sets, target_reps, rest_seconds)
        values (${nid()}, ${id}, ${e.exercise_id}, ${e.sort_order}, ${e.target_sets}, ${e.target_reps}, ${e.rest_seconds})
      `;
    }
    return { id, name: String(src.name), exerciseCount: ex.length };
  });

