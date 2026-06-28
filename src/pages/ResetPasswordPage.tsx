import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { senhaValida } from "@/lib/password";

// Acessada via link do e-mail (Supabase já cria sessão de recovery na URL).
const schema = z
  .object({
    senha: z.string().refine(senhaValida, "A senha não cumpre os requisitos"),
    confirma: z.string(),
  })
  .refine((v) => v.senha === v.confirma, { message: "As senhas não conferem", path: ["confirma"] });

export function ResetPasswordPage() {
  const { definirNovaSenha } = useAuth();
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const parsed = schema.safeParse({ senha, confirma });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { error } = await definirNovaSenha(parsed.data.senha);
    setLoading(false);
    if (error) setErro("Link expirado ou inválido. Solicite outro.");
    else navigate("/", { replace: true });
  }

  return (
    <AuthShell titulo="Nova senha" subtitulo="Defina sua nova senha de acesso">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        <PasswordInput label="Nova senha" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        <PasswordRequirements senha={senha} />
        <PasswordInput label="Confirmar senha" autoComplete="new-password" value={confirma} onChange={(e) => setConfirma(e.target.value)} />
        <Button type="submit" loading={loading} disabled={!senhaValida(senha)} className="w-full">
          Salvar senha
        </Button>
      </form>
    </AuthShell>
  );
}
