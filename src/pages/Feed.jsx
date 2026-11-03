import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../components/AuthContext";
import ComparisonCard from "../components/ComparisonCard";
import { TAGS, tagClass } from "../lib/tags";

export default function Feed() {
  const { session, profile } = useAuth();
  const [posts, setPosts] = useState([]);
  const [userVotes, setUserVotes] = useState({});
  const [activeTags, setActiveTags] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const LIMIT = 12;

  const fetchPosts = useCallback(
    async (pg = 1, tags = activeTags) => {
      setLoading(true);
      const tagParam = tags.size ? [...tags].join(",") : undefined;
      const data = await api.listPosts({
        page: pg,
        limit: LIMIT,
        ...(tagParam ? { tags: tagParam } : {}),
      });
      const arr = Array.isArray(data) ? data : [];
      if (pg === 1) setPosts(arr);
      else setPosts((prev) => [...prev, ...arr]);
      setHasMore(arr.length === LIMIT);
      setLoading(false);

      if (session && arr.length) {
        const votes = await api.getMyVotes(arr.map((p) => p.id));
        setUserVotes((prev) => ({ ...prev, ...votes }));
      }
    },
    [session, activeTags],
  );

  useEffect(() => {
    setPage(1);
    fetchPosts(1, activeTags);
  }, [activeTags]);

  async function handleVote(postId, value) {
    if (!session) return;
    const result = await api.vote(postId, value);
    // Optimistic update
    const prev = userVotes[postId];
    const newVote = result.action === "removed" ? null : result.value;
    setUserVotes((v) => ({ ...v, [postId]: newVote }));
    // Update counts optimistically
    setPosts((ps) =>
      ps.map((p) => {
        if (p.id !== postId) return p;
        let likes = p.likes;
        let dislikes = p.dislikes;
        if (prev === 1) likes--;
        if (prev === -1) dislikes--;
        if (newVote === 1) likes++;
        if (newVote === -1) dislikes++;
        return { ...p, likes, dislikes };
      }),
    );
  }

  function toggleTag(tag) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    fetchPosts(next);
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: "20px",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: 700 }}>Comparisons</h1>
          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "13px",
              marginTop: "3px",
            }}
          >
            Manga panels side-by-side with anime frames
          </p>
        </div>
        <Link
          to="/submit"
          className="btn-primary"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "8px 16px",
            fontSize: "13px",
            borderRadius: "var(--radius-md)",
          }}
        >
          + Submit
        </Link>
      </div>

      {/* Tag filter */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            alignSelf: "center",
            marginRight: "2px",
          }}
        >
          Filter:
        </span>
        {TAGS.map((tag) => {
          const active = activeTags.has(tag);
          return (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              style={{
                padding: "3px 10px",
                borderRadius: "99px",
                border: active ? undefined : "1px solid var(--border)",
                background: active ? undefined : "var(--bg-raised)",
                color: active ? undefined : "var(--text-secondary)",
                fontSize: "11px",
                fontWeight: 600,
                cursor: "pointer",
              }}
              className={active ? `tag tag-${tagClass(tag)}` : ""}
            >
              {tag}
            </button>
          );
        })}
        {activeTags.size > 0 && (
          <button
            onClick={() => setActiveTags(new Set())}
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "3px 6px",
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Post grid */}
      {loading && page === 1 ? (
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
        <div style={emptyStyle}>
          <span style={{ fontSize: "32px" }}>📭</span>
          <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
            No comparisons yet{activeTags.size ? " for those tags" : ""}.
          </p>
          <Link
            to="/submit"
            style={{
              marginTop: "8px",
              color: "var(--accent)",
              fontSize: "13px",
            }}
          >
            Be the first to submit one →
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {posts.map((post) => (
            <ComparisonCard
              key={post.id}
              post={post}
              userVote={userVotes[post.id] ?? null}
              onVote={(val) => handleVote(post.id, val)}
              isLoggedIn={!!session}
            />
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="btn-ghost"
              style={{ alignSelf: "center", padding: "10px 28px" }}
            >
              {loading ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const emptyStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 20px",
  textAlign: "center",
};
