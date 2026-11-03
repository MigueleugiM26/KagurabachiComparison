import {
  handleChangePassword,
  handleLogin,
  handleLogout,
  handleMe,
  handleRegister,
  validateSession,
} from "./auth";
import {
  handleCreatePost,
  handleDeletePost,
  handleGetPost,
  handleListPosts,
  handleUpdatePost,
} from "./posts";
import { handleDelete, handleServe, handleUpload } from "./r2";
import { handleGetProfile, handleUpdateProfile } from "./users";
import { handleMyVotes, handleUserVotes, handleVote } from "./votes";

export interface Env {
  DB: D1Database;
  R2_IMAGES: R2Bucket;
  R2_AVATARS: R2Bucket;
  ALLOWED_ORIGIN: string;
}

function cors(request: Request, env: Env) {
  const allowed = [
    "http://localhost:5173",
    "http://localhost:4173",
    env.ALLOWED_ORIGIN,
  ];
  const rawOrigin = request.headers.get("Origin") ?? "";
  const origin = rawOrigin.replace(/\/$/, "");
  const isAllowed = allowed.some((a) => a.replace(/\/$/, "") === origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

async function handleRequest(request: Request, env: Env): Promise<Response> {
  if (request.method === "OPTIONS")
    return new Response(null, { headers: cors(request, env) });

  const url = new URL(request.url);
  const path = url.pathname;

  const addCors = (r: Response) => {
    const h = cors(request, env);
    Object.entries(h).forEach(([k, v]) => r.headers.set(k, v));
    return r;
  };

  // ── Public routes ────────────────────────────────────────────────────────────
  if (path === "/api/auth/register" && request.method === "POST")
    return addCors(await handleRegister(request, env));
  if (path === "/api/auth/login" && request.method === "POST")
    return addCors(await handleLogin(request, env));

  // Public file serving
  if (path.startsWith("/api/r2/serve/") && request.method === "GET") {
    const rest = path.slice("/api/r2/serve/".length);
    const slash = rest.indexOf("/");
    const bucket = rest.slice(0, slash);
    const filePath = decodeURIComponent(rest.slice(slash + 1));
    return addCors(await handleServe(bucket, filePath, env));
  }

  // Public post upload (image upload for submissions — no auth required)
  if (path === "/api/r2/upload-public" && request.method === "PUT") {
    const bucket = url.searchParams.get("bucket") ?? "";
    const filePath = url.searchParams.get("path") ?? "";
    if (bucket !== "compare-images") {
      return addCors(
        Response.json(
          { error: "Only compare-images bucket is public" },
          { status: 403 },
        ),
      );
    }
    return addCors(await handleUpload(request, env, bucket, filePath));
  }

  // Public posts listing
  if (path === "/api/posts" && request.method === "GET") {
    // Optional auth to check admin
    const token = (request.headers.get("Authorization") ?? "").replace(
      "Bearer ",
      "",
    );
    const userId = token ? await validateSession(env.DB, token) : null;
    return addCors(await handleListPosts(request, env, userId));
  }

  // Public single post
  const getPost = path.match(/^\/api\/posts\/([^/]+)$/);
  if (getPost && request.method === "GET") {
    return addCors(await handleGetPost(env, getPost[1]));
  }

  // Public post submission
  if (path === "/api/posts" && request.method === "POST") {
    const token = (request.headers.get("Authorization") ?? "").replace(
      "Bearer ",
      "",
    );
    const userId = token ? await validateSession(env.DB, token) : null;
    return addCors(await handleCreatePost(request, env, userId));
  }

  // Public profile lookup
  const getProfile = path.match(/^\/api\/users\/([^/]+)$/);
  if (getProfile && request.method === "GET") {
    return addCors(await handleGetProfile(env, getProfile[1]));
  }

  // ── Auth required ─────────────────────────────────────────────────────────────
  const authHeader = request.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");
  const userId = await validateSession(env.DB, token);

  if (!userId) {
    return addCors(Response.json({ error: "Unauthorized" }, { status: 401 }));
  }

  // Auth / me
  if (path === "/api/auth/logout" && request.method === "POST")
    return addCors(await handleLogout(request, env));
  if (path === "/api/auth/me" && request.method === "GET")
    return addCors(await handleMe(env, userId));
  if (path === "/api/auth/change-password" && request.method === "POST")
    return addCors(await handleChangePassword(request, env, userId));

  // Profile update
  if (path === "/api/users/me" && request.method === "PATCH")
    return addCors(await handleUpdateProfile(request, env, userId));

  // Authenticated R2 upload (for avatars)
  if (path === "/api/r2/upload" && request.method === "PUT") {
    const bucket = url.searchParams.get("bucket") ?? "";
    const filePath = url.searchParams.get("path") ?? "";
    return addCors(await handleUpload(request, env, bucket, filePath));
  }
  if (path === "/api/r2/delete" && request.method === "POST")
    return addCors(await handleDelete(request, env));

  // Admin post management
  const patchPost = path.match(/^\/api\/posts\/([^/]+)$/);
  if (patchPost && request.method === "PATCH")
    return addCors(await handleUpdatePost(request, env, userId, patchPost[1]));
  if (patchPost && request.method === "DELETE")
    return addCors(await handleDeletePost(env, userId, patchPost[1]));

  // Votes
  if (path === "/api/votes" && request.method === "POST")
    return addCors(await handleVote(request, env, userId));
  if (path === "/api/votes/my" && request.method === "GET")
    return addCors(await handleMyVotes(request, env, userId));
  if (path === "/api/votes/user" && request.method === "GET") {
    const targetId = url.searchParams.get("id") ?? userId;
    return addCors(await handleUserVotes(env, targetId));
  }

  return addCors(new Response("Not found", { status: 404 }));
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      return await handleRequest(request, env);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Internal server error";
      const origin = request.headers.get("Origin") ?? "*";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods":
            "GET, POST, PATCH, DELETE, PUT, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          Vary: "Origin",
        },
      });
    }
  },
};
