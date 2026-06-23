import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";

const schema = z.string().email("E-mail inválido");

export function RecoverPage() {
  const { enviarResetSenha } = useAuth();
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErro(null);
    const parsed = schema.safeParse(email);
    if (!parsed.success) {
      setErro(parsed.error.issues[0]?.message ?? "E-mail inválido");
      return;
    }
    setLoading(true);
    const { error } = await enviarResetSenha(parsed.data);
    setLoading(false);
    if (error) setErro("Não foi possível enviar. Tente novamente.");
    else setEnviado(true);
  }

  return (
    <AuthShell titulo="Recuperar senha" subtitulo="Enviaremos um link de redefinição">
      {enviado ? (
        <div className="flex flex-col gap-4">
          <Alert tipo="sucesso">Se o e-mail existir, o link foi enviado. Verifique a caixa de entrada.</Alert>
          <Link to="/login" className="text-center text-sm text-azul-principal hover:underline">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          {erro && <Alert tipo="erro">{erro}</Alert>}
          <Input
            label="E-mail"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button type="submit" loading={loading} className="w-full">
            Enviar link
          </Button>
          <Link to="/login" className="text-center text-sm text-azul-principal hover:underline">
            Voltar ao login
          </Link>
        </form>
      )}
    </AuthShell>
  );
}
