import { useRef, useState } from "react";
import { Eye, EyeOff, ThumbsDown, ThumbsUp } from "lucide-react";
import { getImageUrl } from "../lib/api";
import { tagClass } from "../lib/tags";

export default function ComparisonCard({ post, userVote, onVote, isLoggedIn }) {
  const [divider, setDivider] = useState(50);
  const [showLabels, setShowLabels] = useState(true);
  const containerRef = useRef(null);
  const isDragging = useRef(false);

  const mangaCrop = post.manga_crop ?? { x: 0, y: 0, scale: 1 };
  const animeCrop = post.anime_crop ?? { x: 0, y: 0, scale: 1 };

  function updateDivider(clientX) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setDivider(Math.max(0, Math.min(100, pct)));
  }

  function onMouseDown(e) {
    isDragging.current = true;
    updateDivider(e.clientX);
    const onMove = (e) => {
      if (isDragging.current) updateDivider(e.clientX);
    };
    const onUp = () => {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onTouchStart(e) {
    isDragging.current = true;
    updateDivider(e.touches[0].clientX);
  }
  function onTouchMove(e) {
    if (isDragging.current) updateDivider(e.touches[0].clientX);
  }
  function onTouchEnd() {
    isDragging.current = false;
  }

  function imgStyle(crop) {
    const {
      x = 0,
      y = 0,
      scale = 1,
      rotate = 0,
      flipX = false,
      flipY = false,
    } = crop ?? {};
    return {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: "100%",
      height: "100%",
      objectFit: "cover",
      transform: [
        `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        `scale(${flipX ? -scale : scale}, ${flipY ? -scale : scale})`,
        `rotate(${rotate}deg)`,
      ].join(" "),
      transformOrigin: "center center",
      pointerEvents: "none",
      userSelect: "none",
    };
  }

  const tags = Array.isArray(post.tags) ? post.tags : [];
  const likes = post.likes ?? 0;
  const dislikes = post.dislikes ?? 0;

  return (
    <div
      style={{
        background: "var(--bg-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border)",
        overflow: "hidden",
      }}
    >
      {/* ── Comparison image ─────────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: "relative",
          aspectRatio: "16/9",
          overflow: "hidden",
          background: "#000",
          cursor: "col-resize",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        {/* Manga — left side */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `inset(0 ${100 - divider}% 0 0)`,
          }}
        >
          <img
            src={getImageUrl(post.manga_key)}
            alt="Manga"
            style={imgStyle(mangaCrop)}
          />
        </div>

        {/* Anime — right side */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            clipPath: `inset(0 0 0 ${divider}%)`,
          }}
        >
          <img
            src={getImageUrl(post.anime_key)}
            alt="Anime"
            style={imgStyle(animeCrop)}
          />
        </div>

        {/* Divider line */}
        {showLabels && (
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${divider}%`,
              width: "2px",
              background: "rgba(255,255,255,0.9)",
              transform: "translateX(-1px)",
              zIndex: 10,
              pointerEvents: "none",
            }}
          >
            {/* Handle */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%,-50%)",
                width: "34px",
                height: "34px",
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                color: "#000",
                fontWeight: 700,
                pointerEvents: "none",
              }}
            >
              ◂ ▸
            </div>
          </div>
        )}

        {/* Labels */}
        {showLabels && (
          <>
            <div style={labelStyle("left")}>
              Manga{post.chapter ? ` · Ch. ${post.chapter}` : ""}
            </div>
            <div style={labelStyle("right")}>
              Anime{post.episode ? ` · Ep. ${post.episode}` : ""}
            </div>
          </>
        )}

        {/* Toggle labels */}
        <button
          onClick={() => setShowLabels((v) => !v)}
          title={showLabels ? "Hide labels" : "Show labels"}
          style={{
            position: "absolute",
            bottom: "8px",
            right: "8px",
            background: "rgba(0,0,0,.55)",
            border: "none",
            borderRadius: "6px",
            color: "#fff",
            padding: "4px 8px",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            zIndex: 20,
          }}
        >
          {showLabels ? <EyeOff size={12} /> : <Eye size={12} />}
          {showLabels ? "Hide" : "Show"} labels
        </button>
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        {/* Tags */}
        <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", flex: 1 }}>
          {tags.map((tag) => (
            <span key={tag} className={`tag tag-${tagClass(tag)}`}>
              {tag}
            </span>
          ))}
          {!tags.length && (
            <span style={{ color: "var(--text-muted)", fontSize: "12px" }}>
              No tags
            </span>
          )}
        </div>

        {/* Submitter */}
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "11px",
            flexShrink: 0,
          }}
        >
          by {post.submitter_name || "Anonymous"}
        </span>

        {/* Vote buttons */}
        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
          <VoteButton
            icon={<ThumbsUp size={13} />}
            count={likes}
            active={userVote === 1}
            activeColor="var(--success)"
            onClick={() => onVote?.(1)}
            disabled={!isLoggedIn}
            title={isLoggedIn ? "Like" : "Sign in to vote"}
          />
          <VoteButton
            icon={<ThumbsDown size={13} />}
            count={dislikes}
            active={userVote === -1}
            activeColor="var(--danger)"
            onClick={() => onVote?.(-1)}
            disabled={!isLoggedIn}
            title={isLoggedIn ? "Dislike" : "Sign in to vote"}
          />
        </div>
      </div>
    </div>
  );
}

function VoteButton({
  icon,
  count,
  active,
  activeColor,
  onClick,
  disabled,
  title,
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        padding: "4px 10px",
        borderRadius: "var(--radius-sm)",
        background: active ? `${activeColor}22` : "var(--bg-raised)",
        border: `1px solid ${active ? activeColor : "var(--border)"}`,
        color: active ? activeColor : "var(--text-muted)",
        fontSize: "12px",
        fontWeight: 600,
        transition: "all .15s",
      }}
    >
      {icon}
      {count}
    </button>
  );
}

function labelStyle(side) {
  return {
    position: "absolute",
    top: "8px",
    [side]: "8px",
    background: "rgba(0,0,0,.6)",
    color: "#fff",
    fontSize: "10px",
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: "4px",
    backdropFilter: "blur(4px)",
    letterSpacing: ".03em",
    zIndex: 10,
    textTransform: "uppercase",
  };
}
