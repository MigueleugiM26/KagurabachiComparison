import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Pencil, RefreshCw, Trash2, X } from "lucide-react";
import { api, getImageUrl } from "../lib/api";
import { useAuth } from "../components/AuthContext";
import ImageCropper from "../components/ImageCropper";
import { TAGS, tagClass } from "../lib/tags";

export default function Admin() {
  const { profile, session } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [editing, setEditing] = useState(null); // post being edited

  useEffect(() => {
    if (session === null) {
      navigate("/");
      return;
    }
    if (session && profile && !profile.is_admin) {
      navigate("/");
      return;
    }
  }, [session, profile]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    load();
  }, [profile, statusFilter]);

  async function load() {
    setLoading(true);
    const data = await api.listPosts({ status: statusFilter });
    setPosts(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  async function setStatus(id, status) {
    await api.updatePost(id, { status });
    setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  async function deletePost(id) {
    if (!confirm("Permanently delete this post and its images?")) return;
    await api.deletePost(id);
    setPosts((ps) => ps.filter((p) => p.id !== id));
  }

  if (!profile?.is_admin) {
    return (
      <div
        style={{
          padding: "60px",
          textAlign: "center",
          color: "var(--text-muted)",
        }}
      >
        Access denied.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ fontSize: "20px", fontWeight: 700, flex: 1 }}>
          Admin Queue
        </h1>
        <button
          onClick={load}
          className="btn-ghost"
          style={{ display: "flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "20px" }}>
        {["pending", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-md)",
              border: "none",
              background:
                statusFilter === s ? "var(--bg-raised)" : "transparent",
              color:
                statusFilter === s
                  ? "var(--text-primary)"
                  : "var(--text-muted)",
              fontWeight: statusFilter === s ? 600 : 400,
              fontSize: "13px",
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "60px",
            color: "var(--text-muted)",
          }}
        >
          <RefreshCw
            size={20}
            style={{ animation: "spin 1s linear infinite" }}
          />
        </div>
      ) : posts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px",
            color: "var(--text-muted)",
          }}
        >
          No {statusFilter} posts.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {posts.map((post) => (
            <AdminCard
              key={post.id}
              post={post}
              isEditing={editing === post.id}
              onEdit={() => setEditing(editing === post.id ? null : post.id)}
              onApprove={() => setStatus(post.id, "approved")}
              onReject={() => setStatus(post.id, "rejected")}
              onDelete={() => deletePost(post.id)}
              onSaved={(updated) => {
                setPosts((ps) =>
                  ps.map((p) => (p.id === updated.id ? updated : p)),
                );
                setEditing(null);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdminCard({
  post,
  isEditing,
  onEdit,
  onApprove,
  onReject,
  onDelete,
  onSaved,
}) {
  const [editData, setEditData] = useState({
    chapter: post.chapter ?? "",
    episode: post.episode ?? "",
    tags: new Set(post.tags ?? []),
    manga_crop: post.manga_crop ?? { x: 0, y: 0, scale: 1 },
    anime_crop: post.anime_crop ?? { x: 0, y: 0, scale: 1 },
    submitter_name: post.submitter_name ?? "",
  });
  const [saving, setSaving] = useState(false);

  function toggleTag(tag) {
    setEditData((d) => {
      const next = new Set(d.tags);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return { ...d, tags: next };
    });
  }

  async function save() {
    setSaving(true);
    const updated = await api.updatePost(post.id, {
      chapter: editData.chapter || null,
      episode: editData.episode || null,
      tags: [...editData.tags],
      manga_crop: editData.manga_crop,
      anime_crop: editData.anime_crop,
      submitter_name: editData.submitter_name || null,
    });
    setSaving(false);
    onSaved(updated);
  }

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* Image thumbnails */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            position: "relative",
            aspectRatio: "16/9",
            overflow: "hidden",
            borderRight: "1px solid var(--border)",
            background: "#000",
          }}
        >
          <img
            src={getImageUrl(post.manga_key)}
            alt="Manga"
            style={thumbStyle(post.manga_crop)}
          />
          <span style={thumbLabel}>Manga</span>
        </div>
        <div
          style={{
            position: "relative",
            aspectRatio: "16/9",
            overflow: "hidden",
            background: "#000",
          }}
        >
          <img
            src={getImageUrl(post.anime_key)}
            alt="Anime"
            style={thumbStyle(post.anime_crop)}
          />
          <span style={thumbLabel}>Anime</span>
        </div>
      </div>

      {/* Meta */}
      <div style={{ padding: "12px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                marginBottom: "6px",
              }}
            >
              {post.submitter_name ? (
                <>
                  <strong style={{ color: "var(--text-secondary)" }}>
                    {post.submitter_name}
                  </strong>{" "}
                  ·{" "}
                </>
              ) : (
                "Anonymous · "
              )}
              {post.chapter && <>Ch. {post.chapter} · </>}
              {post.episode && <>Ep. {post.episode} · </>}
              {new Date(post.created_at).toLocaleDateString()}
            </div>
            <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
              {(post.tags ?? []).map((t) => (
                <span key={t} className={`tag tag-${tagClass(t)}`}>
                  {t}
                </span>
              ))}
            </div>
            {post.notes && (
              <p
                style={{
                  marginTop: "8px",
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  background: "var(--bg-raised)",
                  borderRadius: "var(--radius-sm)",
                  padding: "6px 10px",
                }}
              >
                Note: {post.notes}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            {post.status !== "approved" && (
              <button
                onClick={onApprove}
                className="btn-success"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  fontSize: "12px",
                }}
              >
                <Check size={13} /> Approve
              </button>
            )}
            {post.status !== "rejected" && (
              <button
                onClick={onReject}
                className="btn-ghost"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  color: "var(--warning)",
                }}
              >
                <X size={13} /> Reject
              </button>
            )}
            <button
              onClick={onEdit}
              className="btn-ghost"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                fontSize: "12px",
              }}
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={onDelete}
              className="btn-danger"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 12px",
                fontSize: "12px",
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Inline editor */}
        {isEditing && (
          <div
            style={{
              marginTop: "16px",
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: "16px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <label style={labelStyle}>
                Chapter
                <input
                  value={editData.chapter}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, chapter: e.target.value }))
                  }
                />
              </label>
              <label style={labelStyle}>
                Episode
                <input
                  value={editData.episode}
                  onChange={(e) =>
                    setEditData((d) => ({ ...d, episode: e.target.value }))
                  }
                />
              </label>
            </div>

            <label style={{ ...labelStyle, marginBottom: "16px" }}>
              Submitter name
              <input
                value={editData.submitter_name}
                onChange={(e) =>
                  setEditData((d) => ({ ...d, submitter_name: e.target.value }))
                }
              />
            </label>

            <div style={{ marginBottom: "16px" }}>
              <p style={{ ...labelStyle, marginBottom: "8px" }}>Tags</p>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {TAGS.map((tag) => {
                  const active = editData.tags.has(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={active ? `tag tag-${tagClass(tag)}` : ""}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "99px",
                        border: active
                          ? "1px solid transparent"
                          : "1px solid var(--border)",
                        background: active ? undefined : "var(--bg-raised)",
                        fontSize: "11px",
                        fontWeight: 600,
                        cursor: "pointer",
                        color: active ? undefined : "var(--text-muted)",
                      }}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Crop editors */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px",
                marginBottom: "16px",
              }}
            >
              <ImageCropper
                imageUrl={getImageUrl(post.manga_key)}
                crop={editData.manga_crop}
                onChange={(c) => setEditData((d) => ({ ...d, manga_crop: c }))}
                label="Manga crop"
              />
              <ImageCropper
                imageUrl={getImageUrl(post.anime_key)}
                crop={editData.anime_crop}
                onChange={(c) => setEditData((d) => ({ ...d, anime_crop: c }))}
                label="Anime crop"
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={save}
                disabled={saving}
                className="btn-primary"
                style={{ padding: "7px 18px", fontSize: "13px" }}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                onClick={onEdit}
                className="btn-ghost"
                style={{ padding: "7px 14px", fontSize: "13px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function thumbStyle(crop) {
  const c = crop ?? { x: 0, y: 0, scale: 1 };
  return {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: `translate(calc(-50% + ${c.x}px), calc(-50% + ${c.y}px)) scale(${c.scale})`,
    transformOrigin: "center center",
    pointerEvents: "none",
  };
}

const thumbLabel = {
  position: "absolute",
  bottom: "6px",
  left: "6px",
  background: "rgba(0,0,0,.6)",
  color: "#fff",
  fontSize: "10px",
  fontWeight: 700,
  padding: "2px 6px",
  borderRadius: "3px",
};

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "5px",
  fontSize: "12px",
  fontWeight: 600,
  color: "var(--text-secondary)",
};
