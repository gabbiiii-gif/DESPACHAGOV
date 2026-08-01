import { Link } from "react-router-dom";
import { Logo } from "@/components/ui/Logo";
import { TERMO_VERSAO } from "@/lib/termo";

// Política de Privacidade — pública (linkada do termo de aceite e da tela "Meus dados").
export function PoliticaPrivacidadePage() {
  return (
    <div className="min-h-dvh bg-cinza-fundo">
      <header className="border-b border-cinza-borda bg-cinza-card px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo className="h-8 w-8" />
          <span className="dg-wordmark text-lg">
            <span className="text-azul-principal">Despacha</span><span className="text-laranja-acento">Gov</span>
          </span>
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-cinza-texto">Política de Privacidade</h1>
        <p className="mt-1 text-sm text-cinza-secundario">Versão {TERMO_VERSAO} · Lei nº 13.709/2018 (LGPD)</p>

        <div className="mt-6 space-y-5 text-sm leading-relaxed text-cinza-texto">
          <section>
            <h2 className="mb-1 font-semibold text-cinza-texto">1. Quem trata seus dados</h2>
            <p>O DespachaGov é uma plataforma de gestão de chamados de manutenção para órgãos públicos.
              Cada Secretaria contratante é a <b>controladora</b> dos dados de seus usuários; o DespachaGov atua
              como <b>operador</b>, tratando os dados conforme as instruções da Secretaria.</p>
          </section>
          <section>
            <h2 className="mb-1 font-semibold text-cinza-texto">2. Dados coletados</h2>
            <p>Dados de cadastro (nome, e-mail, CPF, telefone, cargo, matrícula), registros de chamados
              (descrição, fotos, assinatura de atesto, localização da unidade) e metadados de uso
              (data/hora, navegador) necessários à prestação do serviço.</p>
          </section>
          <section>
            <h2 className="mb-1 font-semibold text-cinza-texto">3. Finalidade e base legal</h2>
            <p>Os dados são tratados exclusivamente para a gestão de demandas de manutenção das unidades
              públicas, com base na execução de políticas públicas e no cumprimento de obrigação legal/contratual
              da Administração (art. 7º, II e III, e art. 11 da LGPD).</p>
          </section>
          <section>
            <h2 className="mb-1 font-semibold text-cinza-texto">4. Compartilhamento e isolamento</h2>
            <p>Os dados são <b>isolados por Secretaria</b> (multi-tenant com segurança em nível de linha). Não há
              compartilhamento com terceiros além dos subprocessadores de infraestrutura (hospedagem e e-mail
              transacional), sob contrato e nos limites desta política.</p>
          </section>
          <section>
            <h2 className="mb-1 font-semibold text-cinza-texto">5. Seus direitos (art. 18)</h2>
            <p>Acesso, download (portabilidade) e <b>exclusão</b> estão disponíveis diretamente na tela
              <b> “Meus dados”</b>, sem depender de solicitação a terceiros. A correção de cadastro é feita
              pelo administrador da sua Secretaria.</p>
            <p className="mt-2">Ao excluir, seus dados pessoais (nome, e-mail, CPF, telefone, cargo e matrícula)
              são apagados e seu acesso é encerrado de forma permanente e irreversível. Os chamados que você
              abriu <b>permanecem sem qualquer vínculo com você</b>: são registro de serviço público que a
              Secretaria é obrigada a conservar (art. 16, I). Também é mantido o registro de que houve aceite
              do termo e em que versão — prova da base legal do tratamento —, sem os identificadores associados
              (IP e navegador são apagados).</p>
          </section>
          <section>
            <h2 className="mb-1 font-semibold text-cinza-texto">6. Segurança</h2>
            <p>Acesso autenticado, senhas com verificação contra vazamentos conhecidos, isolamento por linha
              (RLS), buckets privados com URLs assinadas e tráfego cifrado (HTTPS/HSTS).</p>
          </section>
          <section>
            <h2 className="mb-1 font-semibold text-cinza-texto">7. Contato</h2>
            <p>Dúvidas sobre privacidade: procure o administrador da sua Secretaria, responsável pelo
              atendimento aos titulares.</p>
          </section>
        </div>

        <p className="mt-8 text-sm">
          <Link to="/" className="text-azul-principal underline">Voltar</Link>
        </p>
      </main>
    </div>
  );
}
