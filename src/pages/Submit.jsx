import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, Upload } from "lucide-react";
import { api, toWebP } from "../lib/api";
import { useAuth } from "../components/AuthContext";
import ImageCropper from "../components/ImageCropper";
import { TAGS, tagClass } from "../lib/tags";

const INITIAL_CROP = {
  x: 0,
  y: 0,
  scale: 1,
  rotate: 0,
  flipX: false,
  flipY: false,
};

export default function Submit() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Images
  const [mangaFile, setMangaFile] = useState(null);
  const [animeFile, setAnimeFile] = useState(null);
  const [mangaPreview, setMangaPreview] = useState(null);
  const [animePreview, setAnimePreview] = useState(null);

  // Crops
  const [mangaCrop, setMangaCrop] = useState(INITIAL_CROP);
  const [animeCrop, setAnimeCrop] = useState(INITIAL_CROP);

  // Metadata
  const [chapter, setChapter] = useState("");
  const [episode, setEpisode] = useState("");
  const [tags, setTags] = useState(new Set());
  const [submitterName, setSubmitterName] = useState(
    profile?.display_name ?? "",
  );
  const [notes, setNotes] = useState("");

  // State
  const [step, setStep] = useState("form"); // form | preview | submitting | done
  const [error, setError] = useState("");

  const mangaInputRef = useRef(null);
  const animeInputRef = useRef(null);

  // Prevent accidental drops anywhere on the page from navigating away
  useEffect(() => {
    function block(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "none";
    }
    document.addEventListener("dragover", block);
    document.addEventListener("drop", block);
    return () => {
      document.removeEventListener("dragover", block);
      document.removeEventListener("drop", block);
    };
  }, []);

  async function handleFileSelect(file, side) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setError("");
    const url = URL.createObjectURL(file);
    if (side === "manga") {
      setMangaFile(file);
      setMangaPreview(url);
      setMangaCrop(INITIAL_CROP);
    } else {
      setAnimeFile(file);
      setAnimePreview(url);
      setAnimeCrop(INITIAL_CROP);
    }
  }

  function toggleTag(tag) {
    setTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  async function handleSubmit() {
    if (!mangaFile || !animeFile) {
      setError("Both manga and anime images are required.");
      return;
    }
    setStep("submitting");
    setError("");

    try {
      // Convert to webp
      const [mangaBlob, animeBlob] = await Promise.all([
        toWebP(mangaFile),
        toWebP(animeFile),
      ]);

      // Upload both images
      const id = crypto.randomUUID().replace(/-/g, "");
      const mangaKey = `posts/${id}_manga.webp`;
      const animeKey = `posts/${id}_anime.webp`;

      await Promise.all([
        api.uploadImage(mangaBlob, mangaKey),
        api.uploadImage(animeBlob, animeKey),
      ]);

      // Create post record
      await api.createPost({
        manga_key: mangaKey,
        anime_key: animeKey,
        manga_crop: mangaCrop,
        anime_crop: animeCrop,
        chapter: chapter || undefined,
        episode: episode || undefined,
        tags: [...tags],
        submitter_name: submitterName || undefined,
        notes: notes || undefined,
      });

      setStep("done");
    } catch (e) {
      setError(e.message);
      setStep("preview");
    }
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div
        style={{ maxWidth: "520px", margin: "60px auto", textAlign: "center" }}
      >
        <CheckCircle size={48} color="var(--success)" />
        <h2 style={{ marginTop: "16px", fontSize: "20px", fontWeight: 700 }}>
          Submitted!
        </h2>
        <p style={{ color: "var(--text-muted)", marginTop: "8px" }}>
          Your comparison is in the review queue. It'll go live once approved.
        </p>
        <div
          style={{
            display: "flex",
            gap: "10px",
            justifyContent: "center",
            marginTop: "24px",
          }}
        >
          <button onClick={() => navigate("/")} className="btn-ghost">
            Browse comparisons
          </button>
          <button
            onClick={() => {
              setStep("form");
              setMangaFile(null);
              setAnimeFile(null);
              setMangaPreview(null);
              setAnimePreview(null);
              setMangaCrop(INITIAL_CROP);
              setAnimeCrop(INITIAL_CROP);
              setChapter("");
              setEpisode("");
              setTags(new Set());
              setNotes("");
            }}
            className="btn-primary"
          >
            Submit another
          </button>
        </div>
      </div>
    );
  }

  // ── Preview step ─────────────────────────────────────────────────────────────
  if (step === "preview") {
    const previewPost = {
      id: "preview",
      manga_key: null,
      anime_key: null,
      manga_crop: mangaCrop,
      anime_crop: animeCrop,
      chapter,
      episode,
      tags: [...tags],
      submitter_name: submitterName || "Anonymous",
      likes: 0,
      dislikes: 0,
    };
    // Patch the image URLs to use local blob URLs
    const OrigCard = () => {
      const imgStyle = (crop) => {
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
        };
      };
      const [div, setDiv] = useState(50);
      const ref = useRef(null);
      const dragging = useRef(false);
      function update(x) {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        setDiv(
          Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100)),
        );
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
          <div
            ref={ref}
            onMouseDown={(e) => {
              dragging.current = true;
              update(e.clientX);
              const mv = (e) => dragging.current && update(e.clientX);
              const up = () => {
                dragging.current = false;
                window.removeEventListener("mousemove", mv);
                window.removeEventListener("mouseup", up);
              };
              window.addEventListener("mousemove", mv);
              window.addEventListener("mouseup", up);
            }}
            style={{
              position: "relative",
              aspectRatio: "16/9",
              background: "#000",
              cursor: "col-resize",
              overflow: "hidden",
              userSelect: "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `inset(0 ${100 - div}% 0 0)`,
              }}
            >
              <img src={mangaPreview} alt="" style={imgStyle(mangaCrop)} />
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                clipPath: `inset(0 0 0 ${div}%)`,
              }}
            >
              <img src={animePreview} alt="" style={imgStyle(animeCrop)} />
            </div>
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: `${div}%`,
                width: "2px",
                background: "#fff",
                transform: "translateX(-1px)",
                zIndex: 10,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%,-50%)",
                  width: "30px",
                  height: "30px",
                  borderRadius: "50%",
                  background: "#fff",
                  color: "#000",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                }}
              >
                ◂ ▸
              </div>
            </div>
            <div
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
              }}
            >
              Manga{chapter ? ` · Ch. ${chapter}` : ""}
            </div>
            <div
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "rgba(0,0,0,.6)",
                color: "#fff",
                fontSize: "10px",
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: "4px",
              }}
            >
              Anime{episode ? ` · Ep. ${episode}` : ""}
            </div>
          </div>
          <div
            style={{
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexWrap: "wrap",
            }}
          >
            {[...tags].map((t) => (
              <span key={t} className={`tag tag-${tagClass(t)}`}>
                {t}
              </span>
            ))}
            <span
              style={{
                marginLeft: "auto",
                color: "var(--text-muted)",
                fontSize: "11px",
              }}
            >
              by {submitterName || "Anonymous"}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "24px",
          }}
        >
          <button onClick={() => setStep("form")} className="btn-ghost">
            ← Back
          </button>
          <h1 style={{ fontSize: "18px", fontWeight: 700 }}>Preview</h1>
        </div>
        <p
          style={{
            color: "var(--text-muted)",
            marginBottom: "20px",
            fontSize: "13px",
          }}
        >
          This is how your comparison will look. Drag the handle to check both
          sides.
        </p>
        <OrigCard />
        {error && (
          <div
            style={{
              marginTop: "14px",
              color: "var(--danger)",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}
        <button
          onClick={handleSubmit}
          className="btn-primary"
          style={{ marginTop: "20px", padding: "10px 28px", fontSize: "14px" }}
          disabled={step === "submitting"}
        >
          {step === "submitting" ? "Uploading…" : "Submit for review"}
        </button>
      </div>
    );
  }

  // ── Form step ────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: "860px", margin: "0 auto" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "20px", fontWeight: 700 }}>
          Submit a comparison
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            marginTop: "4px",
            fontSize: "13px",
          }}
        >
          Upload one manga panel and the matching anime frame. Drag each image
          to frame it.
        </p>
      </div>

      {/* ── Image uploaders ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        {[
          {
            label: "Manga panel",
            side: "manga",
            file: mangaFile,
            preview: mangaPreview,
            crop: mangaCrop,
            setCrop: setMangaCrop,
            ref: mangaInputRef,
          },
          {
            label: "Anime frame",
            side: "anime",
            file: animeFile,
            preview: animePreview,
            crop: animeCrop,
            setCrop: setAnimeCrop,
            ref: animeInputRef,
          },
        ].map(({ label, side, file, preview, crop, setCrop, ref }) => (
          <div key={side}>
            <input
              ref={ref}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => handleFileSelect(e.target.files?.[0], side)}
            />
            {!file ? (
              <div
                onClick={() => ref.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "copy";
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-dim)";
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "transparent";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "transparent";
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) handleFileSelect(dropped, side);
                }}
                style={{
                  aspectRatio: "16/9",
                  border: "2px dashed var(--border)",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  transition: "border-color .15s, background .15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--accent)";
                  e.currentTarget.style.background = "var(--accent-dim)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                <Upload size={24} />
                <span style={{ fontWeight: 600, fontSize: "13px" }}>
                  {label}
                </span>
                <span style={{ fontSize: "11px" }}>
                  Click or drop · JPG, PNG, WebP
                </span>
              </div>
            ) : (
              <div>
                <ImageCropper
                  imageUrl={preview}
                  crop={crop}
                  onChange={setCrop}
                  label={label}
                />
                <button
                  onClick={() => {
                    ref.current?.click();
                  }}
                  className="btn-ghost"
                  style={{
                    marginTop: "6px",
                    width: "100%",
                    fontSize: "12px",
                    padding: "5px",
                  }}
                >
                  Change image
                </button>
                <input
                  ref={ref}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleFileSelect(e.target.files?.[0], side)}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── Metadata ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "20px",
        }}
      >
        <label style={labelStyle}>
          Chapter
          <input
            placeholder="e.g. 42"
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
          />
        </label>
        <label style={labelStyle}>
          Episode
          <input
            placeholder="e.g. 3"
            value={episode}
            onChange={(e) => setEpisode(e.target.value)}
          />
        </label>
      </div>

      {/* Tags */}
      <div style={{ marginBottom: "20px" }}>
        <p
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: "8px",
            textTransform: "uppercase",
            letterSpacing: ".04em",
          }}
        >
          Tags{" "}
          <span
            style={{
              color: "var(--text-muted)",
              fontWeight: 400,
              textTransform: "none",
            }}
          >
            (select all that apply)
          </span>
        </p>
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {TAGS.map((tag) => {
            const active = tags.has(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={active ? `tag tag-${tagClass(tag)}` : ""}
                style={{
                  padding: "5px 12px",
                  borderRadius: "99px",
                  border: active
                    ? "1px solid transparent"
                    : "1px solid var(--border)",
                  background: active ? undefined : "var(--bg-raised)",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  color: active ? undefined : "var(--text-secondary)",
                }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      {/* Submitter / notes */}
      {!profile && (
        <label style={{ ...labelStyle, marginBottom: "16px" }}>
          Your name{" "}
          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
            (optional)
          </span>
          <input
            placeholder="Anonymous"
            value={submitterName}
            onChange={(e) => setSubmitterName(e.target.value)}
          />
        </label>
      )}

      <label style={{ ...labelStyle, marginBottom: "20px" }}>
        Notes for the reviewer{" "}
        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
          (optional)
        </span>
        <textarea
          placeholder="Anything you'd like the reviewer to know…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          style={{ resize: "vertical" }}
        />
      </label>

      {error && (
        <div
          style={{
            background: "var(--danger-dim)",
            color: "var(--danger)",
            padding: "10px 14px",
            borderRadius: "var(--radius-md)",
            marginBottom: "16px",
            fontSize: "13px",
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          className="btn-primary"
          disabled={!mangaFile || !animeFile}
          onClick={() => {
            setError("");
            setStep("preview");
          }}
          style={{ padding: "10px 24px" }}
        >
          Preview →
        </button>
        <span
          style={{
            color: "var(--text-muted)",
            fontSize: "12px",
            alignSelf: "center",
          }}
        >
          {!mangaFile || !animeFile
            ? "Upload both images to continue"
            : "Ready to preview"}
        </span>
      </div>
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
