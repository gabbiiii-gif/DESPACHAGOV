import { checarSenha, REGRAS_SENHA_LABEL, type RegrasSenha } from "@/lib/password";

// Checklist ao vivo dos requisitos de senha.
export function PasswordRequirements({ senha }: { senha: string }) {
  const regras = checarSenha(senha);
  const chaves = Object.keys(REGRAS_SENHA_LABEL) as (keyof RegrasSenha)[];
  return (
    <ul className="flex flex-col gap-1" aria-label="Requisitos de senha">
      {chaves.map((k) => {
        const ok = regras[k];
        return (
          <li key={k} className={`flex items-center gap-2 text-xs ${ok ? "text-verde-sucesso" : "text-cinza-secundario"}`}>
            <span aria-hidden className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${ok ? "bg-verde-sucesso/15" : "bg-cinza-borda"}`}>
              {ok ? "✓" : "•"}
            </span>
            {REGRAS_SENHA_LABEL[k]}
          </li>
        );
      })}
    </ul>
  );
}
