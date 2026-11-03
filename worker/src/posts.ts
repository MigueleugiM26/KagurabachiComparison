export interface Env {
  DB: D1Database;
}

// GET /api/posts  — public (approved) or admin (all statuses)
export async function handleListPosts(
  request: Request,
  env: Env,
  userId: string | null
): Promise<Response> {
  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const tags = url.searchParams.get("tags"); // comma-separated
  const page = parseInt(url.searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "20"), 50);
  const offset = (page - 1) * limit;

  // Non-admins can only see approved posts
  let isAdmin = false;
  if (userId) {
    const profile = await env.DB.prepare("SELECT is_admin FROM profiles WHERE id = ?")
      .bind(userId)
      .first<{ is_admin: number }>();
    isAdmin = !!profile?.is_admin;
  }

  const resolvedStatus = isAdmin && status ? status : "approved";

  // Build query — we JOIN votes aggregates in a subquery for performance
  let sql = `
    SELECT 
      p.*,
      COALESCE(v.likes, 0) as likes,
      COALESCE(v.dislikes, 0) as dislikes
    FROM posts p
    LEFT JOIN (
      SELECT post_id,
        SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) as likes,
        SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) as dislikes
      FROM votes GROUP BY post_id
    ) v ON v.post_id = p.id
    WHERE p.status = ?
    ORDER BY p.approved_at DESC, p.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = await env.DB.prepare(sql)
    .bind(resolvedStatus, limit, offset)
    .all<Record<string, unknown>>();

  let posts = rows.results ?? [];

  // Filter by tags client-side (D1 doesn't support JSON array query natively)
  if (tags) {
    const tagList = tags.split(",").map((t) => t.trim().toLowerCase());
    posts = posts.filter((p) => {
      const postTags: string[] = JSON.parse((p.tags as string) || "[]");
      return tagList.every((t) => postTags.map((pt) => pt.toLowerCase()).includes(t));
    });
  }

  // Parse JSON fields
  posts = posts.map(parsePost);

  return Response.json(posts);
}

// GET /api/posts/:id — public
export async function handleGetPost(env: Env, id: string): Promise<Response> {
  const row = await env.DB.prepare(`
    SELECT p.*,
      COALESCE(v.likes, 0) as likes,
      COALESCE(v.dislikes, 0) as dislikes
    FROM posts p
    LEFT JOIN (
      SELECT post_id,
        SUM(CASE WHEN value = 1 THEN 1 ELSE 0 END) as likes,
        SUM(CASE WHEN value = -1 THEN 1 ELSE 0 END) as dislikes
      FROM votes GROUP BY post_id
    ) v ON v.post_id = p.id
    WHERE p.id = ?
  `)
    .bind(id)
    .first<Record<string, unknown>>();

  if (!row) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(parsePost(row));
}

// POST /api/posts — public submission
export async function handleCreatePost(
  request: Request,
  env: Env,
  userId: string | null
): Promise<Response> {
  const body = await request.json<{
    manga_key: string;
    anime_key: string;
    manga_crop?: object;
    anime_crop?: object;
    chapter?: string;
    episode?: string;
    tags?: string[];
    submitter_name?: string;
    notes?: string;
  }>();

  if (!body.manga_key || !body.anime_key) {
    return Response.json({ error: "manga_key and anime_key are required" }, { status: 400 });
  }

  let submitterName = body.submitter_name || null;
  let submitterId = userId;

  // If logged in, fetch their display_name automatically
  if (userId) {
    const profile = await env.DB.prepare("SELECT display_name FROM profiles WHERE id = ?")
      .bind(userId)
      .first<{ display_name: string }>();
    if (profile) submitterName = profile.display_name;
  }

  const id = crypto.randomUUID();
  const mangaCrop = JSON.stringify(body.manga_crop ?? { x: 0, y: 0, scale: 1 });
  const animeCrop = JSON.stringify(body.anime_crop ?? { x: 0, y: 0, scale: 1 });
  const tags = JSON.stringify(body.tags ?? []);

  await env.DB.prepare(`
    INSERT INTO posts (id, manga_key, anime_key, manga_crop, anime_crop, chapter, episode, tags, submitter_id, submitter_name, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .bind(
      id,
      body.manga_key,
      body.anime_key,
      mangaCrop,
      animeCrop,
      body.chapter ?? null,
      body.episode ?? null,
      tags,
      submitterId ?? null,
      submitterName ?? null,
      body.notes ?? null
    )
    .run();

  return Response.json({ id, status: "pending" }, { status: 201 });
}

// PATCH /api/posts/:id — admin only
export async function handleUpdatePost(
  request: Request,
  env: Env,
  userId: string,
  postId: string
): Promise<Response> {
  // Verify admin
  const profile = await env.DB.prepare("SELECT is_admin FROM profiles WHERE id = ?")
    .bind(userId)
    .first<{ is_admin: number }>();
  if (!profile?.is_admin) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json<{
    status?: string;
    chapter?: string;
    episode?: string;
    tags?: string[];
    manga_crop?: object;
    anime_crop?: object;
    submitter_name?: string;
    notes?: string;
  }>();

  const updates: string[] = [];
  const vals: (string | number | null)[] = [];

  if (body.status !== undefined) {
    updates.push("status = ?");
    vals.push(body.status);
    if (body.status === "approved") {
      updates.push("approved_at = datetime('now')");
    }
  }
  if (body.chapter !== undefined) { updates.push("chapter = ?"); vals.push(body.chapter); }
  if (body.episode !== undefined) { updates.push("episode = ?"); vals.push(body.episode); }
  if (body.tags !== undefined) { updates.push("tags = ?"); vals.push(JSON.stringify(body.tags)); }
  if (body.manga_crop !== undefined) { updates.push("manga_crop = ?"); vals.push(JSON.stringify(body.manga_crop)); }
  if (body.anime_crop !== undefined) { updates.push("anime_crop = ?"); vals.push(JSON.stringify(body.anime_crop)); }
  if (body.submitter_name !== undefined) { updates.push("submitter_name = ?"); vals.push(body.submitter_name); }
  if (body.notes !== undefined) { updates.push("notes = ?"); vals.push(body.notes); }

  if (updates.length === 0) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  vals.push(postId);
  await env.DB.prepare(`UPDATE posts SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...vals)
    .run();

  const updated = await env.DB.prepare("SELECT * FROM posts WHERE id = ?")
    .bind(postId)
    .first<Record<string, unknown>>();
  return Response.json(updated ? parsePost(updated) : { ok: true });
}

// DELETE /api/posts/:id — admin only
export async function handleDeletePost(
  env: Env,
  userId: string,
  postId: string
): Promise<Response> {
  const profile = await env.DB.prepare("SELECT is_admin FROM profiles WHERE id = ?")
    .bind(userId)
    .first<{ is_admin: number }>();
  if (!profile?.is_admin) return Response.json({ error: "Forbidden" }, { status: 403 });

  await env.DB.prepare("DELETE FROM votes WHERE post_id = ?").bind(postId).run();
  await env.DB.prepare("DELETE FROM posts WHERE id = ?").bind(postId).run();
  return Response.json({ ok: true });
}

function parsePost(row: Record<string, unknown>) {
  return {
    ...row,
    manga_crop: safeParseJson(row.manga_crop as string, { x: 0, y: 0, scale: 1 }),
    anime_crop: safeParseJson(row.anime_crop as string, { x: 0, y: 0, scale: 1 }),
    tags: safeParseJson(row.tags as string, []),
  };
}

function safeParseJson(val: string | null | undefined, fallback: unknown) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}
