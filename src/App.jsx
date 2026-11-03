import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/AuthContext";
import Layout from "./components/Layout";
import Admin from "./pages/Admin";
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Submit from "./pages/Submit";

function PublicRoute({ children }) {
  const { session } = useAuth();
  if (session === undefined) return <Spinner />;
  if (session) return <Navigate to="/" replace />;
  return children;
}

function AppLayout({ children }) {
  const { session } = useAuth();
  if (session === undefined) return <Spinner />;
  return <Layout>{children}</Layout>;
}

function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--text-muted)", fontSize: "13px" }}>
      Loading…
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

          <Route path="/" element={<AppLayout><Feed /></AppLayout>} />
          <Route path="/submit" element={<AppLayout><Submit /></AppLayout>} />
          <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
          <Route path="/admin" element={<AppLayout><Admin /></AppLayout>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
