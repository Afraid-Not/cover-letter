"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthContext {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: "user" | "admin" | null;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthContext>({
  user: null,
  session: null,
  loading: true,
  role: null,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthCtx);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<"user" | "admin" | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) {
      setRole(null);
      return;
    }
    let cancelled = false;
    Promise.resolve(
      supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .single(),
    )
      .then(({ data }) => {
        if (!cancelled) {
          setRole((data?.role as "user" | "admin") ?? "user");
        }
      })
      .catch(() => {
        if (!cancelled) setRole("user");
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setRole(null);
    window.location.href = "/login";
  };

  return (
    <AuthCtx.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        role,
        signOut,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
};
