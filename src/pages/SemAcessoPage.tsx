import { AuthShell } from "@/components/layout/AuthShell";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";

// Conta autenticada cujo papel não tem área no app (ex.: técnico — que agora é
// apenas um registro cadastrado pela empresa, sem login). Orienta e desloga.
export function SemAcessoPage() {
  const { signOut } = useAuth();
  return (
    <AuthShell titulo="Acesso não disponível" subtitulo="Sua conta não tem uma área no aplicativo">
      <p className="text-sm text-cinza-texto">
        Técnicos não acessam o aplicativo — o cadastro do técnico serve apenas para indicar o
        responsável pelo serviço. O envio dos serviços e a atualização de status são feitos pelo
        <b> administrador da empresa</b>.
      </p>
      <p className="mt-3 text-sm text-cinza-secundario">
        Se você deveria ter acesso, fale com o administrador da sua Secretaria ou empresa.
      </p>
      <Button variant="outline" onClick={() => void signOut()} className="mt-4 w-full">
        Sair
      </Button>
    </AuthShell>
  );
}
