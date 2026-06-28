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
  signIn: (identificador: string, password: string, subdomain?: string | null) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enviarResetSenha: (email: string) => Promise<{ error: string | null }>;
  definirNovaSenha: (senha: string) => Promise<{ error: string | null }>;
  recarregarPerfil: () => Promise<void>;
  // Superadmin: tenant "em foco" para gerir cadastros de uma secretaria.
  setFocoTenant: (id: string | null) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [focoTenantId, setFocoTenantId] = useState<string | null>(null);

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

  // Aceita e-mail OU matrícula. E-mail: login direto. Matrícula: resolve +
  // autentica via Edge Function `login` (service_role), escopando por
  // subdomínio (tenant) p/ evitar colisão de matrícula entre secretarias.
  const signIn = useCallback(async (identificador: string, password: string, subdomain?: string | null) => {
    const id = identificador.trim();
    if (id.includes("@")) {
      const { error } = await supabase.auth.signInWithPassword({ email: id, password });
      return { error: error?.message ?? null };
    }
    const { data, error } = await supabase.functions.invoke<{
      access_token?: string;
      refresh_token?: string;
      error?: string;
    }>("login", { body: { identificador: id, senha: password, subdomain: subdomain ?? null } });
    if (error) return { error: error.message };
    if (!data?.access_token || !data?.refresh_token) {
      return { error: data?.error ?? "Credenciais inválidas." };
    }
    const { error: sErr } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return { error: sErr?.message ?? null };
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

  const setFocoTenant = useCallback((id: string | null) => setFocoTenantId(id), []);

  const role = (profile?.role ?? null) as Role | null;

  const value: AuthState = {
    session,
    profile,
    role,
    // Superadmin sem tenant próprio opera no tenant em foco.
    tenantId: profile?.tenant_id ?? focoTenantId,
    empresaId: profile?.empresa_id ?? null,
    loading,
    signIn,
    signOut,
    enviarResetSenha,
    definirNovaSenha,
    recarregarPerfil,
    setFocoTenant,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
