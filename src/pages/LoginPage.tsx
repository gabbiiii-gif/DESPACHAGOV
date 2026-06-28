import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  identificador: z.string().min(3, "Informe e-mail ou matrícula"),
  senha: z.string().min(6, "Mínimo 6 caracteres"),
});

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const parsed = schema.safeParse({ identificador, senha });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { error } = await signIn(parsed.data.identificador, parsed.data.senha);
    setLoading(false);
    if (error) {
      setErro("E-mail/matrícula ou senha incorretos.");
      return;
    }
    // Roteamento por role acontece no guard pós-login (rota "/").
    const dest = (location.state as { from?: string } | null)?.from ?? "/";
    navigate(dest, { replace: true });
  }

  return (
    <AuthShell titulo="Entrar" subtitulo="Acesse sua conta DespachaGov">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {erro && <Alert tipo="erro">{erro}</Alert>}
        <Input
          label="E-mail ou matrícula"
          type="text"
          autoComplete="username"
          value={identificador}
          onChange={(e) => setIdentificador(e.target.value)}
          placeholder="voce@secretaria.gov.br ou matrícula"
        />
        <PasswordInput
          label="Senha"
          autoComplete="current-password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" loading={loading} className="w-full">
          Entrar
        </Button>
        <Link to="/recuperar-senha" className="text-center text-sm text-azul-principal hover:underline">
          Esqueci minha senha
        </Link>
      </form>
    </AuthShell>
  );
}
