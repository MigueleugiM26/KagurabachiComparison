export interface Env {
  DB: D1Database;
}

// POST /api/votes — cast or toggle a vote (auth required)
export async function handleVote(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const { post_id, value } = await request.json<{ post_id: string; value: number }>();
  if (!post_id || (value !== 1 && value !== -1)) {
    return Response.json({ error: "post_id and value (1 or -1) are required" }, { status: 400 });
  }

  // Check post exists and is approved
  const post = await env.DB.prepare("SELECT id, status FROM posts WHERE id = ?")
    .bind(post_id)
    .first<{ id: string; status: string }>();
  if (!post) return Response.json({ error: "Post not found" }, { status: 404 });
  if (post.status !== "approved") return Response.json({ error: "Cannot vote on pending/rejected post" }, { status: 400 });

  // Check existing vote
  const existing = await env.DB.prepare("SELECT id, value FROM votes WHERE post_id = ? AND user_id = ?")
    .bind(post_id, userId)
    .first<{ id: string; value: number }>();

  if (existing) {
    if (existing.value === value) {
      // Clicking same button again → remove vote
      await env.DB.prepare("DELETE FROM votes WHERE id = ?").bind(existing.id).run();
      return Response.json({ ok: true, action: "removed" });
    } else {
      // Switching vote
      await env.DB.prepare("UPDATE votes SET value = ? WHERE id = ?")
        .bind(value, existing.id)
        .run();
      return Response.json({ ok: true, action: "updated", value });
    }
  } else {
    const id = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO votes (id, post_id, user_id, value) VALUES (?, ?, ?, ?)")
      .bind(id, post_id, userId, value)
      .run();
    return Response.json({ ok: true, action: "created", value });
  }
}

// GET /api/votes/my?post_ids=id1,id2 — get current user's votes for given posts
export async function handleMyVotes(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const url = new URL(request.url);
  const idsParam = url.searchParams.get("post_ids") ?? "";
  if (!idsParam) return Response.json({});

  const ids = idsParam.split(",").slice(0, 100); // max 100
  const placeholders = ids.map(() => "?").join(",");
  const rows = await env.DB.prepare(
    `SELECT post_id, value FROM votes WHERE user_id = ? AND post_id IN (${placeholders})`
  )
    .bind(userId, ...ids)
    .all<{ post_id: string; value: number }>();

  const result: Record<string, number> = {};
  for (const row of rows.results ?? []) {
    result[row.post_id] = row.value;
  }
  return Response.json(result);
}

// GET /api/votes/user/:id — get all votes by a user (for profile page)
export async function handleUserVotes(
  env: Env,
  targetUserId: string
): Promise<Response> {
  const rows = await env.DB.prepare(`
    SELECT v.post_id, v.value, p.manga_key, p.anime_key, p.manga_crop, p.anime_crop,
           p.chapter, p.episode, p.tags, p.submitter_name, p.approved_at
    FROM votes v
    JOIN posts p ON p.id = v.post_id
    WHERE v.user_id = ? AND p.status = 'approved'
    ORDER BY v.created_at DESC
    LIMIT 100
  `)
    .bind(targetUserId)
    .all<Record<string, unknown>>();

  const posts = (rows.results ?? []).map((r) => ({
    ...r,
    id: r.post_id,
    manga_crop: safeParseJson(r.manga_crop as string, { x: 0, y: 0, scale: 1 }),
    anime_crop: safeParseJson(r.anime_crop as string, { x: 0, y: 0, scale: 1 }),
    tags: safeParseJson(r.tags as string, []),
    vote: r.value,
  }));

  return Response.json(posts);
}

function safeParseJson(val: string | null | undefined, fallback: unknown) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}
