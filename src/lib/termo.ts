// Termo de Uso e Privacidade — conteúdo versionado.
//
// Por que o texto vive aqui e não dentro do JSX: ele precisa ser renderizado em
// dois lugares (o gate de aceite e a página pública /termos-de-uso) e, acima de
// tudo, precisa ser HASHÁVEL. Antes, o texto estava embutido no LgpdGate e o
// banco guardava só a string de versão — quem editasse o parágrafo sem lembrar
// de trocar a versão quebrava a prova de consentimento em silêncio: os registros
// diriam "aceitou 2026-06-v1" apontando para um texto que mudou.
//
// REGRA: mudou qualquer caractere de TERMO_SECOES, sobe TERMO_VERSAO.
// Subir a versão força todos os usuários a aceitar de novo (LgpdGate compara a
// versão vigente com a aceita), que é o comportamento correto quando o
// documento muda.

export interface SecaoTermo {
  titulo: string;
  paragrafos: string[];
}

export const TERMO_VERSAO = "2026-07-v2";

export const TERMO_SECOES: SecaoTermo[] = [
  {
    titulo: "1. O que é o DespachaGov",
    paragrafos: [
      "O DespachaGov é uma plataforma de gestão de demandas de manutenção de unidades públicas. Por ele, a unidade registra um problema, a Secretaria tria e direciona a uma empresa contratada, e a execução é comprovada com fotos e atesto do responsável.",
      "O acesso é fornecido pelo órgão público contratante. A plataforma não é aberta ao público em geral.",
    ],
  },
  {
    titulo: "2. Quem pode usar",
    paragrafos: [
      "O uso é restrito a servidores, gestores e prestadores autorizados pelo órgão contratante. Sua conta é criada por convite de um administrador — não há autocadastro.",
      "O órgão contratante define seu papel na plataforma, e o papel determina o que você pode ver e fazer.",
    ],
  },
  {
    titulo: "3. Sua conta e sua senha",
    paragrafos: [
      "A conta é pessoal e intransferível. Você é responsável por tudo que for feito com ela.",
      "Não compartilhe sua senha. Se suspeitar que alguém teve acesso a ela, troque imediatamente pela opção de recuperação e avise o administrador da sua Secretaria.",
      "As senhas são verificadas contra bases públicas de vazamentos conhecidos no momento do cadastro.",
    ],
  },
  {
    titulo: "4. Uso responsável",
    paragrafos: [
      "Registre apenas informações verdadeiras. Chamados, fotos e atestos gerados aqui instruem a execução e o pagamento de serviços públicos, e têm valor de documento.",
      "Não tente acessar dados de outra unidade, outra empresa ou outro órgão, nem contornar as restrições do seu papel. Os acessos são registrados.",
      "Não use a plataforma para armazenar dados pessoais além dos necessários à demanda de manutenção. Evite escrever CPF, telefone ou endereço de terceiros no campo de descrição.",
    ],
  },
  {
    titulo: "5. Dados pessoais",
    paragrafos: [
      "Tratamos seus dados conforme a Lei nº 13.709/2018 (LGPD), exclusivamente para a gestão das demandas de manutenção, a execução contratual, a auditoria e a prestação de contas.",
      "Os dados são isolados por órgão contratante: uma Secretaria não enxerga os dados de outra.",
      "Você pode acessar, baixar e excluir seus dados pessoais a qualquer momento na tela “Meus dados”. Os detalhes de quais dados coletamos, por quanto tempo e com quem compartilhamos estão na Política de Privacidade.",
    ],
  },
  {
    titulo: "6. Registros e auditoria",
    paragrafos: [
      "Guardamos o histórico das ações relevantes sobre cada chamado — quem abriu, quem triou, quem executou e quando. Esse histórico é exigido para prestação de contas de serviço público e permanece mesmo que você exclua sua conta, sem vínculo com você.",
      "Também registramos a data, a versão e o texto deste termo no momento em que você o aceita.",
    ],
  },
  {
    titulo: "7. Disponibilidade",
    paragrafos: [
      "Trabalhamos para manter a plataforma disponível, mas ela pode ficar fora do ar para manutenção, correção ou por falha de terceiros que dão suporte à infraestrutura.",
      "Recomendamos que demandas urgentes de segurança não dependam exclusivamente da plataforma.",
    ],
  },
  {
    titulo: "8. Mudanças neste termo",
    paragrafos: [
      "Se este termo mudar, publicamos uma nova versão e pedimos seu aceite no próximo acesso. Você poderá ler o novo texto antes de aceitar.",
      "O histórico de versões que você aceitou fica disponível na tela “Meus dados”.",
    ],
  },
  {
    titulo: "9. Legislação aplicável",
    paragrafos: [
      "Aplica-se a legislação brasileira, em especial a Lei nº 13.709/2018 (LGPD) e a Lei nº 14.133/2021, no que couber à relação contratual entre o órgão e a empresa prestadora.",
    ],
  },
];

// Serialização determinística do documento — é isto que vira o hash gravado
// junto do aceite. Precisa ser estável: qualquer mudança na forma de juntar
// (separador, ordem, espaçamento) muda o hash de textos idênticos e invalida a
// comparação com aceites antigos. Não mexa sem bumpar TERMO_VERSAO.
export function textoCanonicoTermo(secoes: SecaoTermo[] = TERMO_SECOES): string {
  return secoes
    .map((s) => [s.titulo, ...s.paragrafos].join("\n"))
    .join("\n\n");
}

// SHA-256 em hex. crypto.subtle existe no browser e no Node 22 (test runner).
export async function hashTermo(texto: string = textoCanonicoTermo()): Promise<string> {
  const bytes = new TextEncoder().encode(texto);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
