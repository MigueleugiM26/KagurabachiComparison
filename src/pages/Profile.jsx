import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ThumbsDown, ThumbsUp } from "lucide-react";
import { api, getAvatarUrl, getImageUrl, toWebP } from "../lib/api";
import { useAuth } from "../components/AuthContext";
import { tagClass } from "../lib/tags";
import ComparisonCard from "../components/ComparisonCard";

export default function Profile() {
  const { session, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const [votes, setVotes] = useState([]);
  const [voteTab, setVoteTab] = useState("liked"); // liked | disliked
  const [votesLoading, setVotesLoading] = useState(true);
  const [modalPost, setModalPost] = useState(null);

  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (session === null) navigate("/login");
  }, [session]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      loadVotes();
    }
  }, [profile]);

  async function openModal(post) {
    setModalPost(post); // open immediately with what we have
    const full = await api.getPost(post.post_id);
    setModalPost((prev) =>
      prev ? { ...prev, likes: full.likes, dislikes: full.dislikes } : null,
    );
  }

  async function loadVotes() {
    setVotesLoading(true);
    const data = await api.getUserVotes(profile.id);
    setVotes(Array.isArray(data) ? data : []);
    setVotesLoading(false);
  }

  async function saveProfile() {
    setSaving(true);
    setSaveMsg("");
    try {
      await api.updateProfile({ display_name: displayName });
      await refreshProfile();
      setSaveMsg("Saved!");
    } catch (e) {
      setSaveMsg(e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  async function changePassword() {
    setPwMsg("");
    try {
      await api.changePassword(oldPw, newPw);
      setPwMsg("Password changed. You'll be signed out.");
      setOldPw("");
      setNewPw("");
    } catch (e) {
      setPwMsg(e.message);
    }
  }

  async function handleAvatarUpload(file) {
    if (!file) return;
    try {
      const blob = await toWebP(file, 0.88);
      const key = `avatars/${profile.id}.webp`;
      await api.uploadAvatar(blob, key);
      await api.updateProfile({ avatar_url: key });
      await refreshProfile();
    } catch (e) {
      alert(e.message);
    }
  }

  if (!profile) return null;

  const initial = profile.display_name?.[0]?.toUpperCase() ?? "?";
  const filteredVotes = votes.filter((v) =>
    voteTab === "liked" ? v.vote === 1 : v.vote === -1,
  );

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto" }}>
      {/* Profile header */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "20px",
            flexWrap: "wrap",
          }}
        >
          {/* Avatar */}
          <div style={{ position: "relative" }}>
            <div
              style={{
                width: "68px",
                height: "68px",
                borderRadius: "50%",
                background: "var(--accent-dim)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                fontSize: "28px",
                overflow: "hidden",
                flexShrink: 0,
              }}
            >
              {profile.avatar_url ? (
                <img
                  src={getAvatarUrl(profile.avatar_url)}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                initial
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              style={{
                position: "absolute",
                bottom: "-2px",
                right: "-2px",
                width: "22px",
                height: "22px",
                borderRadius: "50%",
                background: "var(--bg-raised)",
                border: "2px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                cursor: "pointer",
              }}
              title="Change avatar"
            >
              <Camera size={11} color="var(--text-secondary)" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleAvatarUpload(e.target.files?.[0])}
            />
          </div>

          {/* Name / username */}
          <div style={{ flex: 1, minWidth: "200px" }}>
            <div
              style={{ fontSize: "20px", fontWeight: 700, marginBottom: "2px" }}
            >
              {profile.display_name}
            </div>
            <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>
              @{profile.username}
            </div>
            {profile.is_admin && (
              <span
                style={{
                  marginTop: "6px",
                  display: "inline-block",
                  fontSize: "10px",
                  fontWeight: 700,
                  color: "var(--warning)",
                  letterSpacing: ".05em",
                }}
              >
                ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Edit display name */}
        <div
          style={{
            marginTop: "20px",
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "16px",
          }}
        >
          <label style={labelStyle}>
            Display name
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <button
                onClick={saveProfile}
                disabled={saving}
                className="btn-primary"
                style={{ whiteSpace: "nowrap", padding: "8px 16px" }}
              >
                {saving ? "…" : "Save"}
              </button>
            </div>
            {saveMsg && (
              <span style={{ fontSize: "12px", color: "var(--success)" }}>
                {saveMsg}
              </span>
            )}
          </label>
        </div>
      </div>

      {/* Change password */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "14px" }}>
          Change password
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <label style={labelStyle}>
            Current password
            <input
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
            />
          </label>
          <label style={labelStyle}>
            New password
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
            />
          </label>
          {pwMsg && (
            <span
              style={{
                fontSize: "12px",
                color: pwMsg.includes("changed")
                  ? "var(--success)"
                  : "var(--danger)",
              }}
            >
              {pwMsg}
            </span>
          )}
          <button
            onClick={changePassword}
            className="btn-ghost"
            style={{ alignSelf: "flex-start", padding: "7px 16px" }}
          >
            Update password
          </button>
        </div>
      </div>

      {/* Voted posts */}
      <div
        style={{
          background: "var(--bg-surface)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border)",
          overflow: "hidden",
        }}
      >
        <div
          style={{ display: "flex", borderBottom: "1px solid var(--border)" }}
        >
          {[
            {
              key: "liked",
              icon: <ThumbsUp size={13} />,
              label: `Liked (${votes.filter((v) => v.vote === 1).length})`,
            },
            {
              key: "disliked",
              icon: <ThumbsDown size={13} />,
              label: `Disliked (${votes.filter((v) => v.vote === -1).length})`,
            },
          ].map(({ key, icon, label }) => (
            <button
              key={key}
              onClick={() => setVoteTab(key)}
              style={{
                flex: 1,
                padding: "12px",
                background:
                  voteTab === key ? "var(--bg-raised)" : "transparent",
                border: "none",
                borderBottom:
                  voteTab === key
                    ? `2px solid var(--accent)`
                    : "2px solid transparent",
                color:
                  voteTab === key ? "var(--text-primary)" : "var(--text-muted)",
                fontWeight: voteTab === key ? 600 : 400,
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {votesLoading ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            Loading…
          </div>
        ) : filteredVotes.length === 0 ? (
          <div
            style={{
              padding: "40px",
              textAlign: "center",
              color: "var(--text-muted)",
              fontSize: "13px",
            }}
          >
            No {voteTab} posts yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {filteredVotes.map((post) => (
              <VotePostRow
                key={post.post_id}
                post={post}
                onClick={() => openModal(post)}
              />
            ))}
          </div>
        )}
      </div>

      {modalPost && (
        <div
          onClick={() => setModalPost(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.75)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: "900px" }}
          >
            <ComparisonCard
              post={{ ...modalPost, id: modalPost.post_id }}
              userVote={modalPost.vote}
              onVote={async (val) => {
                const prev = modalPost.vote;
                const result = await api.vote(modalPost.post_id, val);
                const newVote =
                  result.action === "removed" ? null : result.value;
                setModalPost((p) => {
                  let likes = p.likes ?? 0;
                  let dislikes = p.dislikes ?? 0;
                  if (prev === 1) likes--;
                  if (prev === -1) dislikes--;
                  if (newVote === 1) likes++;
                  if (newVote === -1) dislikes++;
                  return { ...p, vote: newVote, likes, dislikes };
                });
                setVotes((prev) =>
                  prev.map((v) =>
                    v.post_id === modalPost.post_id
                      ? { ...v, vote: newVote }
                      : v,
                  ),
                );
              }}
              isLoggedIn={!!session}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function VotePostRow({ post, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        gap: "12px",
        padding: "12px 16px",
        borderBottom: "1px solid var(--border-subtle)",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      {/* Thumbnail */}
      <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
        {["manga_key", "anime_key"].map((k) => (
          <div
            key={k}
            style={{
              width: "64px",
              height: "36px",
              borderRadius: "4px",
              overflow: "hidden",
              background: "#000",
              position: "relative",
              flexShrink: 0,
            }}
          >
            <img
              src={getImageUrl(post[k])}
              alt=""
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "translate(-50%,-50%)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginBottom: "4px",
          }}
        >
          {post.chapter && `Ch. ${post.chapter}`}
          {post.chapter && post.episode && " · "}
          {post.episode && `Ep. ${post.episode}`}
        </div>
        <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
          {(post.tags ?? []).map((t) => (
            <span key={t} className={`tag tag-${tagClass(t)}`}>
              {t}
            </span>
          ))}
        </div>
      </div>

      <span
        style={{ fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}
      >
        {post.submitter_name || "Anonymous"}
      </span>
    </div>
  );
}

const labelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--text-secondary)",
};
