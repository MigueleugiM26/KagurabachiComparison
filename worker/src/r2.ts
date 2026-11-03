export interface Env {
  R2_IMAGES: R2Bucket;
  R2_AVATARS: R2Bucket;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 15 * 1024 * 1024; // 15 MB

function getBucket(bucketName: string, env: Env): R2Bucket | null {
  if (bucketName === "compare-images") return env.R2_IMAGES;
  if (bucketName === "compare-avatars") return env.R2_AVATARS;
  return null;
}

// PUT /api/r2/upload?bucket=xxx&path=xxx
// Public for compare-images (post submissions), auth required for avatars (enforced in router)
export async function handleUpload(
  request: Request,
  env: Env,
  bucketName: string,
  path: string
): Promise<Response> {
  const bucket = getBucket(bucketName, env);
  if (!bucket) return Response.json({ error: "Unknown bucket" }, { status: 400 });

  const contentType = request.headers.get("Content-Type") ?? "";
  if (!ALLOWED_TYPES.includes(contentType)) {
    return Response.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  const body = await request.arrayBuffer();
  if (body.byteLength > MAX_SIZE) {
    return Response.json({ error: "File too large (max 15 MB)" }, { status: 413 });
  }

  await bucket.put(path, body, { httpMetadata: { contentType } });
  return Response.json({ ok: true, path });
}

// GET /api/r2/serve/:bucket/:path
export async function handleServe(
  bucketName: string,
  path: string,
  env: Env
): Promise<Response> {
  const bucket = getBucket(bucketName, env);
  if (!bucket) return new Response("Not found", { status: 404 });

  const obj = await bucket.get(path);
  if (!obj) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  headers.set("Content-Type", obj.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("ETag", obj.httpEtag);
  return new Response(obj.body, { headers });
}

// DELETE /api/r2/delete
export async function handleDelete(request: Request, env: Env): Promise<Response> {
  const { bucket: bucketName, path } = await request.json<{ bucket: string; path: string }>();
  const bucket = getBucket(bucketName, env);
  if (!bucket) return Response.json({ error: "Unknown bucket" }, { status: 400 });
  await bucket.delete(path);
  return Response.json({ ok: true });
}
