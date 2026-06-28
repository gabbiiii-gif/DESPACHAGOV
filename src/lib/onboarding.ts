// Domínio puro do onboarding da Secretaria (primeiros passos do piloto).
// Sem React/Supabase: decide os passos e o progresso a partir das contagens.

export interface ContagensOnboarding {
  unidades: number;
  empresas: number;
  usuarios: number; // usuários do tenant (responsáveis/gestores/admins de empresa)
}

export interface PassoOnboarding {
  chave: string;
  titulo: string;
  descricao: string;
  to: string;
  concluido: boolean;
}

export function passosOnboarding(c: ContagensOnboarding): PassoOnboarding[] {
  return [
    {
      chave: "unidades",
      titulo: "Cadastre as unidades",
      descricao: "Escolas, postos e prédios atendidos (importe por CSV se já tiver a lista).",
      to: "/secretaria/unidades",
      concluido: c.unidades > 0,
    },
    {
      chave: "empresas",
      titulo: "Cadastre as empresas",
      descricao: "Prestadoras que vão executar os serviços.",
      to: "/secretaria/empresas",
      concluido: c.empresas > 0,
    },
    {
      chave: "usuarios",
      titulo: "Convide a equipe",
      descricao: "Responsáveis de unidade (abrem chamados) e admins de empresa.",
      to: "/secretaria/usuarios",
      concluido: c.usuarios > 0,
    },
  ];
}

export function progressoOnboarding(c: ContagensOnboarding): { feitos: number; total: number } {
  const passos = passosOnboarding(c);
  return { feitos: passos.filter((p) => p.concluido).length, total: passos.length };
}

export function onboardingCompleto(c: ContagensOnboarding): boolean {
  return passosOnboarding(c).every((p) => p.concluido);
}
