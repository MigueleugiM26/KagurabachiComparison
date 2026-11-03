import {
  LayoutGrid,
  LogOut,
  Menu,
  ShieldCheck,
  Upload,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { getAvatarUrl } from "../lib/api";

const NAV_PUBLIC = [
  { to: "/", icon: LayoutGrid, label: "Comparisons" },
  { to: "/submit", icon: Upload, label: "Submit" },
];
const NAV_AUTH = [{ to: "/profile", icon: User, label: "My Profile" }];
const NAV_ADMIN = [{ to: "/admin", icon: ShieldCheck, label: "Admin Queue" }];

export default function Layout({ children }) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 768;
      setMobile(m);
      if (!m) setOpen(true);
      else setOpen(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  const initial = profile?.display_name?.[0]?.toUpperCase() ?? "?";
  const navItems = [
    ...NAV_PUBLIC,
    ...(profile ? NAV_AUTH : []),
    ...(profile?.is_admin ? NAV_ADMIN : []),
  ];

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      {/* Mobile header */}
      {mobile && (
        <div style={s.mobileHeader}>
          <button onClick={() => setOpen(true)} style={s.hamburger}>
            <Menu size={22} />
          </button>
          <span style={s.mobileBrand}>Kagurabachi Comparisons</span>
        </div>
      )}

      {/* Overlay */}
      {mobile && open && (
        <div style={s.overlay} onClick={() => setOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        style={{
          ...s.sidebar,
          ...(mobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                height: "100vh",
                zIndex: 1000,
                transform: open ? "translateX(0)" : "translateX(-100%)",
                transition: "transform .2s ease",
              }
            : {}),
        }}
      >
        <div style={s.sidebarInner}>
          <div style={s.brand}>
            <img
              src="/logo.jpg"
              alt="Logo"
              style={{ width: "32px", height: "32px", borderRadius: "6px" }}
            />
            <span style={s.brandText}>Kagurabachi Comparisons</span>
            {mobile && (
              <button onClick={() => setOpen(false)} style={s.closeBtn}>
                <X size={18} />
              </button>
            )}
          </div>

          <nav style={s.nav}>
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                onClick={() => mobile && setOpen(false)}
                style={({ isActive }) => ({
                  ...s.navItem,
                  ...(isActive ? s.navActive : {}),
                })}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>

          <div style={s.userArea}>
            {profile ? (
              <>
                <div
                  style={s.avatar}
                  onClick={() => {
                    navigate("/profile");
                    mobile && setOpen(false);
                  }}
                >
                  {profile.avatar_url ? (
                    <img
                      src={getAvatarUrl(profile.avatar_url)}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "50%",
                      }}
                    />
                  ) : (
                    initial
                  )}
                </div>
                <div
                  style={{ flex: 1, minWidth: 0 }}
                  onClick={() => {
                    navigate("/profile");
                    mobile && setOpen(false);
                  }}
                >
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {profile.display_name}
                  </div>
                  {!!profile.is_admin && (
                    <div
                      style={{
                        fontSize: "10px",
                        color: "var(--warning)",
                        fontWeight: 700,
                      }}
                    >
                      ADMIN
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  title="Sign out"
                  style={s.signOut}
                >
                  <LogOut size={14} />
                </button>
              </>
            ) : (
              <NavLink to="/login" style={{ ...s.navItem, flex: 1 }}>
                Sign in
              </NavLink>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ ...s.main, ...(mobile ? { paddingTop: "68px" } : {}) }}>
        {children}
      </main>
    </div>
  );
}

const s = {
  mobileHeader: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    height: "56px",
    background: "var(--bg-surface)",
    borderBottom: "1px solid var(--border)",
    display: "flex",
    alignItems: "center",
    padding: "0 16px",
    zIndex: 100,
    gap: "12px",
  },
  hamburger: {
    background: "transparent",
    color: "var(--text-primary)",
    padding: "6px",
    display: "flex",
  },
  mobileBrand: { fontWeight: 700, fontSize: "15px" },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.5)",
    zIndex: 999,
  },
  sidebar: {
    width: "220px",
    flexShrink: 0,
    background: "var(--bg-surface)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
  },
  sidebarInner: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    padding: "18px 10px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 8px 18px",
    borderBottom: "1px solid var(--border-subtle)",
    marginBottom: "10px",
  },
  brandText: { fontWeight: 700, fontSize: "14px", flex: 1 },
  closeBtn: {
    background: "transparent",
    color: "var(--text-muted)",
    padding: "2px",
  },
  nav: { display: "flex", flexDirection: "column", gap: "2px", flex: 1 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 10px",
    borderRadius: "var(--radius-md)",
    color: "var(--text-secondary)",
    fontWeight: 500,
    textDecoration: "none",
    transition: "background .12s, color .12s",
    cursor: "pointer",
  },
  navActive: { background: "var(--accent-dim)", color: "var(--accent)" },
  userArea: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "12px 8px 0",
    borderTop: "1px solid var(--border-subtle)",
    cursor: "pointer",
  },
  avatar: {
    width: "30px",
    height: "30px",
    borderRadius: "50%",
    background: "var(--accent-dim)",
    color: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "13px",
    flexShrink: 0,
    overflow: "hidden",
  },
  signOut: {
    background: "transparent",
    color: "var(--text-muted)",
    padding: "5px",
    borderRadius: "var(--radius-md)",
    display: "flex",
    flexShrink: 0,
  },
  main: { flex: 1, overflow: "auto", padding: "24px 20px" },
};
