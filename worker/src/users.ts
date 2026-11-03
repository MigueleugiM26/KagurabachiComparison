export interface Env {
  DB: D1Database;
  R2_AVATARS: R2Bucket;
}

// PATCH /api/users/profile — update own profile
export async function handleUpdateProfile(
  request: Request,
  env: Env,
  userId: string
): Promise<Response> {
  const body = await request.json<{
    display_name?: string;
    avatar_url?: string;
  }>();

  const updates: string[] = [];
  const vals: (string | null)[] = [];

  if (body.display_name !== undefined) {
    if (!body.display_name.trim()) {
      return Response.json({ error: "Display name cannot be empty" }, { status: 400 });
    }
    updates.push("display_name = ?");
    vals.push(body.display_name.trim());
  }
  if (body.avatar_url !== undefined) {
    updates.push("avatar_url = ?");
    vals.push(body.avatar_url);
  }

  if (updates.length === 0) return Response.json({ error: "Nothing to update" }, { status: 400 });

  vals.push(userId);
  await env.DB.prepare(`UPDATE profiles SET ${updates.join(", ")} WHERE id = ?`)
    .bind(...vals)
    .run();

  const profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?")
    .bind(userId)
    .first();
  return Response.json({ user: profile });
}

// GET /api/users/:id — get public profile
export async function handleGetProfile(env: Env, targetId: string): Promise<Response> {
  const profile = await env.DB.prepare(
    "SELECT id, username, display_name, avatar_url, created_at FROM profiles WHERE id = ?"
  )
    .bind(targetId)
    .first();
  if (!profile) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(profile);
}
