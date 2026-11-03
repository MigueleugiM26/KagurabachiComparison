import { useRef, useState, useCallback } from "react";
import {
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Grid,
} from "lucide-react";

/**
 * ImageCropper
 * Lets the user pan, zoom, rotate, and flip an image within a fixed 16:9 container.
 * crop = { x, y, scale, rotate, flipX, flipY }
 *   x/y      — pixel offsets from center
 *   scale    — 1–5
 *   rotate   — degrees (multiples of 90 for buttons, free via input)
 *   flipX/Y  — boolean
 */
export default function ImageCropper({ imageUrl, crop, onChange, label }) {
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const touchRef = useRef(null);
  const [showGrid, setShowGrid] = useState(false);
  const [focused, setFocused] = useState(false);

  const {
    x = 0,
    y = 0,
    scale = 1,
    rotate = 0,
    flipX = false,
    flipY = false,
  } = crop ?? {};

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  function maxOffset(s) {
    const el = containerRef.current;
    if (!el) return { mx: 9999, my: 9999 };
    return {
      mx: (el.offsetWidth * (s - 1)) / 2,
      my: (el.offsetHeight * (s - 1)) / 2,
    };
  }

  function update(patch) {
    const next = { x, y, scale, rotate, flipX, flipY, ...patch };
    // Re-clamp position after any change
    const { mx, my } = maxOffset(next.scale);
    next.x = clamp(next.x, -mx, mx);
    next.y = clamp(next.y, -my, my);
    onChange(next);
  }

  function applyScale(newScale) {
    update({ scale: clamp(newScale, 1, 5) });
  }

  // ── Mouse drag ───────────────────────────────────────────────────────────────
  function onMouseDown(e) {
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ix: x, iy: y };

    function onMove(e) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.sx;
      const dy = e.clientY - dragRef.current.sy;
      const { mx, my } = maxOffset(scale);
      onChange({
        x: clamp(dragRef.current.ix + dx, -mx, mx),
        y: clamp(dragRef.current.iy + dy, -my, my),
        scale,
        rotate,
        flipX,
        flipY,
      });
    }
    function onUp() {
      dragRef.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function onWheel(e) {
    e.preventDefault();
    applyScale(scale - e.deltaY * 0.002);
  }

  // ── Touch ────────────────────────────────────────────────────────────────────
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      touchRef.current = {
        type: "pan",
        sx: e.touches[0].clientX,
        sy: e.touches[0].clientY,
        ix: x,
        iy: y,
      };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      touchRef.current = { type: "pinch", initDist: dist, initScale: scale };
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (!touchRef.current) return;
    if (touchRef.current.type === "pan" && e.touches.length === 1) {
      const dx = e.touches[0].clientX - touchRef.current.sx;
      const dy = e.touches[0].clientY - touchRef.current.sy;
      const { mx, my } = maxOffset(scale);
      onChange({
        x: clamp(touchRef.current.ix + dx, -mx, mx),
        y: clamp(touchRef.current.iy + dy, -my, my),
        scale,
        rotate,
        flipX,
        flipY,
      });
    } else if (touchRef.current.type === "pinch" && e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );
      applyScale(
        touchRef.current.initScale * (dist / touchRef.current.initDist),
      );
    }
  }

  // ── Arrow-key nudge ──────────────────────────────────────────────────────────
  function onKeyDown(e) {
    const STEP = e.shiftKey ? 10 : 1;
    const moves = {
      ArrowLeft: { x: x - STEP },
      ArrowRight: { x: x + STEP },
      ArrowUp: { y: y - STEP },
      ArrowDown: { y: y + STEP },
    };
    if (moves[e.key]) {
      e.preventDefault();
      update(moves[e.key]);
    }
  }

  function reset() {
    onChange({ x: 0, y: 0, scale: 1, rotate: 0, flipX: false, flipY: false });
  }

  // ── Transform string ─────────────────────────────────────────────────────────
  const imgStyle = {
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
    draggable: false,
  };

  // ── Rule-of-thirds grid ──────────────────────────────────────────────────────
  const GridOverlay = () => (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 5,
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {[33.33, 66.66].map((v) => (
        <g key={v}>
          <line
            x1={v}
            y1="0"
            x2={v}
            y2="100"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.3"
          />
          <line
            x1="0"
            y1={v}
            x2="100"
            y2={v}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="0.3"
          />
        </g>
      ))}
    </svg>
  );

  const iconBtn = (onClick, title, children, active = false) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        background: active
          ? "var(--accent-dim, rgba(99,102,241,.15))"
          : "transparent",
        border: `1px solid ${active ? "var(--accent, #6366f1)" : "var(--border)"}`,
        borderRadius: "var(--radius-sm, 4px)",
        color: active ? "var(--accent, #6366f1)" : "var(--text-muted)",
        padding: "3px 7px",
        fontSize: "11px",
        display: "flex",
        alignItems: "center",
        gap: "3px",
        cursor: "pointer",
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {/* ── Header row ── */}
      {label && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <label
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-secondary)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {label}
          </label>
          <button
            onClick={reset}
            title="Reset all"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm, 4px)",
              color: "var(--text-muted)",
              padding: "2px 8px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              cursor: "pointer",
            }}
          >
            <RotateCcw size={11} /> Reset
          </button>
        </div>
      )}

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        tabIndex={0}
        onMouseDown={onMouseDown}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "16/9",
          overflow: "hidden",
          background: "var(--bg-base)",
          borderRadius: "var(--radius-md, 6px)",
          border: `1px solid ${focused ? "var(--accent, #6366f1)" : "var(--border)"}`,
          cursor: "grab",
          touchAction: "none",
          outline: "none",
        }}
      >
        {imageUrl ? (
          <>
            <img src={imageUrl} alt="" style={imgStyle} />
            {showGrid && <GridOverlay />}
          </>
        ) : (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--text-muted)",
              gap: "6px",
            }}
          >
            <span style={{ fontSize: "24px" }}>🖼️</span>
            <span style={{ fontSize: "12px" }}>Upload an image first</span>
          </div>
        )}
      </div>

      {/* ── Toolbar row 1: rotate + flip + grid ── */}
      <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
        {iconBtn(
          () => update({ rotate: rotate - 90 }),
          "Rotate left 90°",
          <>
            <RotateCcw size={11} /> 90°
          </>,
        )}
        {iconBtn(
          () => update({ rotate: rotate + 90 }),
          "Rotate right 90°",
          <>
            <RotateCw size={11} /> 90°
          </>,
        )}
        {iconBtn(
          () => update({ flipX: !flipX }),
          "Flip horizontal",
          <>
            <FlipHorizontal size={11} /> Flip H
          </>,
          flipX,
        )}
        {iconBtn(
          () => update({ flipY: !flipY }),
          "Flip vertical",
          <>
            <FlipVertical size={11} /> Flip V
          </>,
          flipY,
        )}
        {iconBtn(
          () => setShowGrid((v) => !v),
          "Toggle rule-of-thirds grid",
          <>
            <Grid size={11} /> Grid
          </>,
          showGrid,
        )}
      </div>

      {/* ── Toolbar row 2: zoom slider + numeric X/Y ── */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        {/* Zoom */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            flex: "1 1 120px",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "11px",
              color: "var(--text-muted)",
              whiteSpace: "nowrap",
            }}
          >
            Zoom
          </span>
          <input
            type="range"
            min={1}
            max={5}
            step={0.01}
            value={scale}
            onChange={(e) => applyScale(parseFloat(e.target.value))}
            style={{
              flex: 1,
              minWidth: 0,
              accentColor: "var(--accent, #6366f1)",
            }}
          />
          <input
            type="number"
            min={1}
            max={5}
            step={0.01}
            value={scale.toFixed(2)}
            onChange={(e) => applyScale(parseFloat(e.target.value) || 1)}
            style={numInput}
          />
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            ×
          </span>
        </div>

        {/* X offset */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            X
          </span>
          <input
            type="number"
            step={1}
            value={Math.round(x)}
            onChange={(e) => update({ x: parseFloat(e.target.value) || 0 })}
            style={numInput}
          />
        </div>

        {/* Y offset */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            Y
          </span>
          <input
            type="number"
            step={1}
            value={Math.round(y)}
            onChange={(e) => update({ y: parseFloat(e.target.value) || 0 })}
            style={numInput}
          />
        </div>

        {/* Rotation free input */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            °
          </span>
          <input
            type="number"
            step={1}
            value={rotate % 360}
            onChange={(e) =>
              update({ rotate: parseFloat(e.target.value) || 0 })
            }
            style={numInput}
          />
        </div>
      </div>

      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>
        Drag to pan · Scroll / pinch to zoom · Arrow keys nudge (Shift = 10px)
      </p>
    </div>
  );
}

const numInput = {
  width: "52px",
  fontSize: "11px",
  padding: "2px 5px",
  borderRadius: "var(--radius-sm, 4px)",
  border: "1px solid var(--border)",
  background: "var(--bg-raised, var(--bg-base))",
  color: "var(--text-primary)",
  textAlign: "center",
};
