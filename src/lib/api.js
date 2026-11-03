const BASE = import.meta.env.VITE_API_URL;

function token() {
  return localStorage.getItem("kp_token") ?? "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token()}`,
  };
}

export function getImageUrl(key) {
  return `${BASE}/api/r2/serve/compare-images/${encodeURIComponent(key)}`;
}

export function getAvatarUrl(key) {
  return `${BASE}/api/r2/serve/compare-avatars/${encodeURIComponent(key)}`;
}

// Convert any image file to webp via Canvas
export async function toWebP(file, quality = 0.92) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("WebP conversion failed")),
        "image/webp",
        quality,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  async register(email, password, username, displayName) {
    const r = await fetch(`${BASE}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, username, displayName }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Registration failed");
    localStorage.setItem("kp_token", data.token);
    return data;
  },

  async login(email, password) {
    const r = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Login failed");
    localStorage.setItem("kp_token", data.token);
    return data;
  },

  async logout() {
    await fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: authHeaders(),
    });
    localStorage.removeItem("kp_token");
  },

  async me() {
    if (!token()) return null;
    const r = await fetch(`${BASE}/api/auth/me`, { headers: authHeaders() });
    if (!r.ok) return null;
    const data = await r.json();
    return data.user;
  },

  async changePassword(oldPassword, newPassword) {
    const r = await fetch(`${BASE}/api/auth/change-password`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed");
    return data;
  },

  // ── Profile ──────────────────────────────────────────────────────────────────
  async updateProfile(patch) {
    const r = await fetch(`${BASE}/api/users/me`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Failed");
    return data.user;
  },

  async getProfile(userId) {
    const r = await fetch(`${BASE}/api/users/${userId}`);
    return r.json();
  },

  // ── R2 Upload ─────────────────────────────────────────────────────────────────
  async uploadImage(blob, path) {
    // Public endpoint — no auth required for post images
    const r = await fetch(
      `${BASE}/api/r2/upload-public?bucket=compare-images&path=${encodeURIComponent(path)}`,
      {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: blob,
      },
    );
    if (!r.ok) throw new Error("Upload failed");
    return path;
  },

  async uploadAvatar(blob, path) {
    const r = await fetch(
      `${BASE}/api/r2/upload?bucket=compare-avatars&path=${encodeURIComponent(path)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "image/webp",
          Authorization: `Bearer ${token()}`,
        },
        body: blob,
      },
    );
    if (!r.ok) throw new Error("Avatar upload failed");
    return path;
  },

  // ── Posts ─────────────────────────────────────────────────────────────────────
  async listPosts(params = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.tags) qs.set("tags", params.tags);
    if (params.page) qs.set("page", String(params.page));
    const r = await fetch(`${BASE}/api/posts?${qs}`, {
      headers: authHeaders(),
    });
    return r.json();
  },

  async getPost(id) {
    const r = await fetch(`${BASE}/api/posts/${id}`);
    return r.json();
  },

  async createPost(body) {
    const r = await fetch(`${BASE}/api/posts`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Submission failed");
    return data;
  },

  async updatePost(id, patch) {
    const r = await fetch(`${BASE}/api/posts/${id}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Update failed");
    return data;
  },

  async deletePost(id) {
    const r = await fetch(`${BASE}/api/posts/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    return r.json();
  },

  // ── Votes ─────────────────────────────────────────────────────────────────────
  async vote(post_id, value) {
    const r = await fetch(`${BASE}/api/votes`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ post_id, value }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Vote failed");
    return data;
  },

  async getMyVotes(postIds) {
    if (!token() || !postIds.length) return {};
    const r = await fetch(
      `${BASE}/api/votes/my?post_ids=${postIds.join(",")}`,
      { headers: authHeaders() },
    );
    return r.json();
  },

  async getUserVotes(userId) {
    const r = await fetch(`${BASE}/api/votes/user?id=${userId}`, {
      headers: authHeaders(),
    });
    return r.json();
  },
};
