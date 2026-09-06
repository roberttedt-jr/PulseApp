import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { getSql, type Sql } from "@/lib/db";
import { nid, toIso } from "@/lib/utils";
import { normalizeMuscle } from "./exercise-meta";
import { isDemoUserId } from "./seed-flags";
import { ensurePulseV6 } from "./seed";
import {
  decodeCursor,
  encodeCursor,
  formatHandle,
  isUniqueViolation,
  normalizeUsername,
  parseReportReason,
  parseVisibility,
  parseWorkoutVisibility,
  rateLimit,
  sanitizeSearchQuery,
  socialError,
  validateBio,
  validateDisplayName,
  validateUsername,
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

export type FeedPost = {
  id: string;
  authorId: string;
  username: string | null;
  handle: string;
  name: string;
  image: string | null;
  createdAt: string;
  title: string;
  durationSeconds: number | null;
  exerciseCount: number | null;
  setCount: number | null;
  muscles: string[];
  volume: number | null;
  prLabel: string | null;
  visibility: Exclude<WorkoutVisibility, "me">;
  liked: boolean;
  likeCount: number;
  mine: boolean;
};

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
  const username = r.username ? String(r.username) : null;
  const muscles = String(r.muscles ?? "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return {
    id: String(r.id),
    authorId: String(r.user_id),
    username,
    handle: formatHandle(username),
    name: String(r.display_name ?? "Atleta"),
    image: r.image ? String(r.image) : null,
    createdAt: iso(r.created_at),
    title: String(r.title || "Entrenamiento libre"),
    durationSeconds: r.duration_seconds == null ? null : num(r.duration_seconds),
    exerciseCount: r.exercise_count == null ? null : num(r.exercise_count),
    setCount: r.set_count == null ? null : num(r.set_count),
    muscles,
    volume: bool(r.share_volume) ? num(r.volume) : null,
    prLabel: bool(r.share_prs) && r.pr_label ? String(r.pr_label) : null,
    visibility: vis === "public" ? "public" : "followers",
    liked: bool(r.liked),
    likeCount: num(r.like_count),
    mine: r.user_id === viewerId,
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
      select a.id, a.user_id, a.title, a.created_at, a.visibility, a.volume, a.duration_seconds,
        a.share_volume, a.share_prs, a.exercise_count, a.set_count, a.muscles, a.pr_label,
        p.display_name, p.image, p.username,
        exists(select 1 from feed_likes l where l.feed_id = a.id and l.user_id = ${context.userId}) as liked,
        (select count(*)::int from feed_likes l where l.feed_id = a.id) as like_count
      from activity_feed a
      join profiles p on p.user_id = a.user_id
      where a.deleted_at is null
        and a.kind = 'workout'
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
      select id from activity_feed where id = ${data.postId} and user_id = ${context.userId} and deleted_at is null
    `)[0];
    if (!row) throw socialError(404, "No se ha encontrado esta publicación.");
    if (vis === "me") {
      await sql`update activity_feed set deleted_at = now() where id = ${data.postId} and user_id = ${context.userId}`;
      return { deleted: true, visibility: "me" as const };
    }
    await sql`
      update activity_feed set visibility = ${vis}
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
    const targetType = data.targetType === "user" ? "user" : "post";
    const targetId = String(data.targetId ?? "");
    if (!targetId) throw socialError(422, "Falta el contenido a reportar.");
    if (targetType === "user" && targetId === context.userId) throw socialError(422, "No puedes reportarte a ti mismo.");
    if (targetType === "post") {
      const post = (await sql<AnyRow>`select user_id from activity_feed where id = ${targetId}`)[0];
      if (!post) throw socialError(404, "No se ha encontrado esta publicación.");
      if (post.user_id === context.userId) throw socialError(422, "No puedes reportar tu propia publicación.");
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
        select a.id, a.user_id, a.title, a.created_at, a.visibility, a.volume, a.duration_seconds,
          a.share_volume, a.share_prs, a.exercise_count, a.set_count, a.muscles, a.pr_label,
          p.display_name, p.image, p.username,
          exists(select 1 from feed_likes l where l.feed_id = a.id and l.user_id = ${context.userId}) as liked,
          (select count(*)::int from feed_likes l where l.feed_id = a.id) as like_count
        from activity_feed a
        join profiles p on p.user_id = a.user_id
        where a.user_id = ${userId}
          and a.deleted_at is null
          and a.kind = 'workout'
          and a.visibility in ('followers', 'public')
          and not exists (
            select 1 from hidden_posts h where h.user_id = ${context.userId} and h.post_id = a.id
          )
          and (
            ${mine}
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
