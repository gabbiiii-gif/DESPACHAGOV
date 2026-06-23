// Cliente Supabase (frontend). Usa apenas chaves PÚBLICAS (anon).
// service_role / Anthropic / Resend NUNCA entram aqui — só em Edge Functions.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falha cedo em dev: evita erros obscuros adiante.
  console.warn(
    "[DespachaGov] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. Copie .env.example → .env.local.",
  );
}

export const supabase = createClient(url ?? "", anonKey ?? "", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
