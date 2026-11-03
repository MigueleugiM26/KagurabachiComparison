import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.me().then((user) => {
      if (user) {
        setSession(true);
        setProfile(user);
      } else setSession(null);
    });
  }, []);

  async function signIn(email, password) {
    const data = await api.login(email, password);
    setSession(true);
    setProfile(data.user);
  }

  async function signUp(email, password, username, displayName) {
    const data = await api.register(email, password, username, displayName);
    setSession(true);
    setProfile(data.user);
  }

  async function signOut() {
    await api.logout();
    setSession(null);
    setProfile(null);
  }

  async function refreshProfile() {
    const user = await api.me();
    if (user) setProfile(user);
  }

  return (
    <AuthContext.Provider
      value={{ session, profile, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
