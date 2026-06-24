import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/services/supabase";
import type { UserProfile } from "@/lib/auth";
import type { Role } from "@/lib/permissions";

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  role: Role | null;
  tenantId: string | null;
  empresaId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enviarResetSenha: (email: string) => Promise<{ error: string | null }>;
  definirNovaSenha: (senha: string) => Promise<{ error: string | null }>;
  recarregarPerfil: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarPerfil = useCallback(async (uid: string) => {
    const { data } = await supabase.from("users").select("*").eq("id", uid).maybeSingle();
    setProfile(data ?? null);
  }, []);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      if (data.session) await carregarPerfil(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, sess) => {
      setSession(sess);
      if (sess) await carregarPerfil(sess.user.id);
      else setProfile(null);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [carregarPerfil]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const enviarResetSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    return { error: error?.message ?? null };
  }, []);

  const definirNovaSenha = useCallback(async (senha: string) => {
    const { error } = await supabase.auth.updateUser({ password: senha });
    return { error: error?.message ?? null };
  }, []);

  const recarregarPerfil = useCallback(async () => {
    if (session) await carregarPerfil(session.user.id);
  }, [session, carregarPerfil]);

  const role = (profile?.role ?? null) as Role | null;

  const value: AuthState = {
    session,
    profile,
    role,
    tenantId: profile?.tenant_id ?? null,
    empresaId: profile?.empresa_id ?? null,
    loading,
    signIn,
    signOut,
    enviarResetSenha,
    definirNovaSenha,
    recarregarPerfil,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
