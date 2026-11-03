import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../components/AuthContext";

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({
    email: "",
    password: "",
    username: "",
    displayName: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit() {
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await signIn(form.email, form.password);
      } else {
        if (!form.username.trim()) {
          setError("Username is required");
          setLoading(false);
          return;
        }
        await signUp(
          form.email,
          form.password,
          form.username.trim(),
          form.displayName || form.username,
        );
      }
      navigate("/");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg-base)",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <img
            src="/logo.jpg"
            alt="Logo"
            style={{ width: "64px", height: "64px", borderRadius: "6px" }}
          />
          <h1 style={{ fontSize: "22px", fontWeight: 700 }}>
            Kagurabachi Comparisons
          </h1>
          <p
            style={{
              color: "var(--text-muted)",
              marginTop: "6px",
              fontSize: "13px",
            }}
          >
            Manga × Anime comparisons
          </p>
        </div>

        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "28px",
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              marginBottom: "24px",
              background: "var(--bg-base)",
              borderRadius: "var(--radius-md)",
              padding: "4px",
            }}
          >
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "6px",
                  borderRadius: "var(--radius-sm)",
                  background: mode === m ? "var(--bg-raised)" : "transparent",
                  color:
                    mode === m ? "var(--text-primary)" : "var(--text-muted)",
                  fontWeight: mode === m ? 600 : 400,
                  border: "none",
                  fontSize: "13px",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            <label style={labelStyle}>
              Email
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </label>

            {mode === "register" && (
              <>
                <label style={labelStyle}>
                  Username
                  <input
                    placeholder="chihiro_rokuhira"
                    value={form.username}
                    onChange={(e) => set("username", e.target.value)}
                  />
                </label>
                <label style={labelStyle}>
                  Display name{" "}
                  <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                    (optional)
                  </span>
                  <input
                    placeholder="Chihiro"
                    value={form.displayName}
                    onChange={(e) => set("displayName", e.target.value)}
                  />
                </label>
              </>
            )}

            <label style={labelStyle}>
              Password
              <input
                type="password"
                placeholder={mode === "register" ? "Min. 6 characters" : ""}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </label>

            {error && (
              <div
                style={{
                  background: "var(--danger-dim)",
                  color: "var(--danger)",
                  padding: "10px 14px",
                  borderRadius: "var(--radius-md)",
                  fontSize: "13px",
                }}
              >
                {error}
              </div>
            )}

            <button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{ marginTop: "4px", padding: "10px" }}
            >
              {loading ? "…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </div>
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: "16px",
            color: "var(--text-muted)",
            fontSize: "12px",
          }}
        >
          You can also{" "}
          <a href="/" style={{ color: "var(--accent)" }}>
            browse comparisons
          </a>{" "}
          or{" "}
          <a href="/submit" style={{ color: "var(--accent)" }}>
            submit
          </a>{" "}
          without an account.
        </p>
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
