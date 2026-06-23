import { useState, type FormEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

const schema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(6, "Mínimo 6 caracteres"),
});

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const parsed = schema.safeParse({ email, senha });
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    setLoading(true);
    const { error } = await signIn(parsed.data.email, parsed.data.senha);
    setLoading(false);
    if (error) {
      setErro("E-mail ou senha incorretos.");
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
          label="E-mail"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@secretaria.gov.br"
        />
        <Input
          label="Senha"
          type="password"
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
