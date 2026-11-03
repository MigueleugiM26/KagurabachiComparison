import * as bcrypt from "bcryptjs";

export interface Env {
  DB: D1Database;
}

const sessionCache = new Map<string, { userId: string | null; expiresAt: number }>();
const SESSION_CACHE_TTL = 5000;

function cleanSessionCache() {
  const now = Date.now();
  for (const [key, val] of sessionCache) {
    if (val.expiresAt < now) sessionCache.delete(key);
  }
}

export async function createSession(db: D1Database, userId: string): Promise<string> {
  const token =
    crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await db
    .prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(token, userId, expires)
    .run();
  return token;
}

export async function validateSession(db: D1Database, token: string): Promise<string | null> {
  if (!token) return null;
  const now = Date.now();
  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > now) return cached.userId;
  if (sessionCache.size > 1000) cleanSessionCache();

  const row = await db
    .prepare("SELECT user_id FROM sessions WHERE token = ? AND expires_at > datetime('now')")
    .bind(token)
    .first<{ user_id: string }>();

  const userId = row?.user_id ?? null;
  sessionCache.set(token, { userId, expiresAt: now + SESSION_CACHE_TTL });
  return userId;
}

export function invalidateSession(token: string) {
  sessionCache.delete(token);
}

// POST /api/auth/register
export async function handleRegister(request: Request, env: Env): Promise<Response> {
  const { email, password, username, displayName } = await request.json<{
    email: string; password: string; username: string; displayName: string;
  }>();

  if (!email || !password || !username) {
    return Response.json({ error: "email, password and username are required" }, { status: 400 });
  }
  if (password.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const existing = await env.DB.prepare("SELECT id FROM auth_users WHERE email = ?")
    .bind(email.toLowerCase())
    .first();
  if (existing) return Response.json({ error: "Email already in use" }, { status: 409 });

  const existingUsername = await env.DB.prepare("SELECT id FROM profiles WHERE username = ?")
    .bind(username.toLowerCase())
    .first();
  if (existingUsername) return Response.json({ error: "Username already taken" }, { status: 409 });

  const id = crypto.randomUUID();
  const hash = await bcrypt.hash(password, 10);
  await env.DB.prepare("INSERT INTO auth_users (id, email, password_hash) VALUES (?, ?, ?)")
    .bind(id, email.toLowerCase(), hash)
    .run();
  await env.DB.prepare(
    "INSERT INTO profiles (id, username, display_name) VALUES (?, ?, ?)"
  )
    .bind(id, username.toLowerCase(), displayName || username)
    .run();

  const token = await createSession(env.DB, id);
  const profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?").bind(id).first();
  return Response.json({ token, user: profile }, { status: 201 });
}

// POST /api/auth/login
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  const { email, password } = await request.json<{ email: string; password: string }>();

  const user = await env.DB.prepare(
    "SELECT id, password_hash FROM auth_users WHERE email = ?"
  )
    .bind(email.toLowerCase())
    .first<{ id: string; password_hash: string }>();

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?")
    .bind(user.id)
    .first();
  const token = await createSession(env.DB, user.id);
  return Response.json({ token, user: profile });
}

// POST /api/auth/logout
export async function handleLogout(request: Request, env: Env): Promise<Response> {
  const token = (request.headers.get("Authorization") ?? "").replace("Bearer ", "");
  invalidateSession(token);
  await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
  return Response.json({ ok: true });
}

// GET /api/auth/me
export async function handleMe(env: Env, userId: string): Promise<Response> {
  const profile = await env.DB.prepare("SELECT * FROM profiles WHERE id = ?")
    .bind(userId)
    .first();
  return Response.json({ user: profile });
}

// POST /api/auth/change-password
export async function handleChangePassword(
  request: Request, env: Env, userId: string
): Promise<Response> {
  const { oldPassword, newPassword } = await request.json<{
    oldPassword: string; newPassword: string;
  }>();
  if (!newPassword || newPassword.length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  const user = await env.DB.prepare("SELECT password_hash FROM auth_users WHERE id = ?")
    .bind(userId)
    .first<{ password_hash: string }>();
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });
  if (!(await bcrypt.compare(oldPassword, user.password_hash))) {
    return Response.json({ error: "Current password is incorrect" }, { status: 401 });
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await env.DB.prepare("UPDATE auth_users SET password_hash = ? WHERE id = ?")
    .bind(hash, userId)
    .run();
  await env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  return Response.json({ ok: true });
}
