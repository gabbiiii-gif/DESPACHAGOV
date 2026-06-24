# E-mail transacional por evento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enviar e-mail aos atores certos a cada mudança de estado de um chamado, reusando os eventos já gravados em `chamado_eventos`, sem tocar no código cliente.

**Architecture:** `chamado_eventos` INSERT → Database Webhook do Supabase → Edge Function `notify-event` (service_role, `verify_jwt=false`) resolve destinatários, deduplica via tabela `notificacoes` e envia via Resend. Lógica de domínio (matriz evento→papel, link, template) fica pura em `src/lib/notificacoes.ts` (vitest); a função importa essa lógica e cuida só de I/O.

**Tech Stack:** TypeScript estrito, Vitest, Supabase (Postgres + RLS + Edge Functions Deno), Resend. Projeto `evdjijvxllhrlkkhrcdi` (sa-east-1), Supabase Pro com MCP/CLI disponíveis.

Spec: `docs/superpowers/specs/2026-06-24-email-transacional-eventos-design.md`.

---

## File Structure

- `src/lib/notificacoes.ts` — **novo, puro**. `destinatariosDe`, `linkPara`, `emailEvento` + tipos. Única fonte da lógica de domínio.
- `src/lib/notificacoes.test.ts` — **novo**. Vitest da lógica pura.
- `supabase/migrations/0007_notificacoes.sql` — **novo**. Tabela `notificacoes` + índice de dedupe + RLS.
- `supabase/functions/_shared/email.ts` — **modificar**. Corrigir remetente `.com.br`→`.com`.
- `supabase/functions/notify-event/index.ts` — **novo**. Orquestração (I/O) na Edge Function.

---

## Task 1: Lógica de domínio pura (`src/lib/notificacoes.ts`)

**Files:**
- Create: `src/lib/notificacoes.ts`
- Test: `src/lib/notificacoes.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/notificacoes.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { destinatariosDe, linkPara, emailEvento } from "./notificacoes";

describe("destinatariosDe", () => {
  it("mapeia cada evento para os papéis corretos", () => {
    expect(destinatariosDe("aberto")).toEqual(["admin_secretaria"]);
    expect(destinatariosDe("atribuido")).toEqual(["empresa"]);
    expect(destinatariosDe("tecnico_designado")).toEqual(["tecnico"]);
    expect(destinatariosDe("em_campo")).toEqual(["responsavel"]);
    expect(destinatariosDe("concluido")).toEqual(["responsavel", "admin_secretaria"]);
    expect(destinatariosDe("cancelado")).toEqual(["responsavel", "empresa"]);
  });

  it("retorna lista vazia para evento desconhecido (defensivo em runtime)", () => {
    expect(destinatariosDe("xpto")).toEqual([]);
  });
});

describe("linkPara", () => {
  it("aponta para a área do papel no domínio de produção", () => {
    expect(linkPara("responsavel")).toBe("https://www.despachagov.com/unidade");
    expect(linkPara("empresa")).toBe("https://www.despachagov.com/empresa");
    expect(linkPara("tecnico")).toBe("https://www.despachagov.com/empresa");
    expect(linkPara("admin_secretaria")).toBe("https://www.despachagov.com/secretaria/chamados");
  });
});

describe("emailEvento", () => {
  const ctx = { protocolo: "2026-000123", unidadeNome: "Escola Central", link: "https://x/y" };

  it("inclui protocolo e unidade no assunto/corpo de 'aberto'", () => {
    const { subject, html } = emailEvento("aberto", ctx);
    expect(subject).toContain("2026-000123");
    expect(html).toContain("Escola Central");
    expect(html).toContain(ctx.link);
    expect(html).toContain("#2456A6");
  });

  it("gera assunto não vazio para todos os eventos", () => {
    for (const ev of ["aberto", "atribuido", "tecnico_designado", "em_campo", "concluido", "cancelado"] as const) {
      expect(emailEvento(ev, ctx).subject.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- notificacoes`
Expected: FAIL — `Cannot find module './notificacoes'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/notificacoes.ts`:

```ts
// Domínio puro das notificações por evento de chamado.
// Sem I/O: importado tanto pelo front (vitest) quanto pela Edge Function (Deno).

export type EventoChamado =
  | "aberto"
  | "atribuido"
  | "tecnico_designado"
  | "em_campo"
  | "concluido"
  | "cancelado";

export type PapelNotificavel = "admin_secretaria" | "empresa" | "tecnico" | "responsavel";

const MATRIZ: Record<EventoChamado, PapelNotificavel[]> = {
  aberto: ["admin_secretaria"],
  atribuido: ["empresa"],
  tecnico_designado: ["tecnico"],
  em_campo: ["responsavel"],
  concluido: ["responsavel", "admin_secretaria"],
  cancelado: ["responsavel", "empresa"],
};

// Quais papéis notificar para um evento. Desconhecido → [] (defensivo).
export function destinatariosDe(evento: string): PapelNotificavel[] {
  return MATRIZ[evento as EventoChamado] ?? [];
}

const BASE = "https://www.despachagov.com";

// Deep link best-effort para a área do papel.
export function linkPara(papel: PapelNotificavel): string {
  switch (papel) {
    case "responsavel":
      return `${BASE}/unidade`;
    case "admin_secretaria":
      return `${BASE}/secretaria/chamados`;
    case "empresa":
    case "tecnico":
      return `${BASE}/empresa`;
  }
}

export interface EventoEmailCtx {
  protocolo: string;
  unidadeNome: string;
  link: string;
}

const FRASE: Record<EventoChamado, (c: EventoEmailCtx) => { titulo: string; corpo: string }> = {
  aberto: (c) => ({
    titulo: `Novo chamado ${c.protocolo}`,
    corpo: `Um novo chamado foi aberto na unidade <b>${c.unidadeNome}</b> e aguarda atribuição.`,
  }),
  atribuido: (c) => ({
    titulo: `Chamado ${c.protocolo} atribuído à sua empresa`,
    corpo: `O chamado da unidade <b>${c.unidadeNome}</b> foi atribuído à sua empresa.`,
  }),
  tecnico_designado: (c) => ({
    titulo: `Você foi escalado — chamado ${c.protocolo}`,
    corpo: `Você foi designado para o chamado da unidade <b>${c.unidadeNome}</b>.`,
  }),
  em_campo: (c) => ({
    titulo: `Atendimento iniciado — chamado ${c.protocolo}`,
    corpo: `O atendimento do chamado na unidade <b>${c.unidadeNome}</b> começou.`,
  }),
  concluido: (c) => ({
    titulo: `Chamado ${c.protocolo} concluído`,
    corpo: `O chamado da unidade <b>${c.unidadeNome}</b> foi concluído. O comprovante já está disponível.`,
  }),
  cancelado: (c) => ({
    titulo: `Chamado ${c.protocolo} cancelado`,
    corpo: `O chamado da unidade <b>${c.unidadeNome}</b> foi cancelado.`,
  }),
};

// Monta assunto + HTML (identidade azul/laranja) para o evento.
export function emailEvento(evento: EventoChamado, ctx: EventoEmailCtx): { subject: string; html: string } {
  const { titulo, corpo } = FRASE[evento](ctx);
  const html = `<div style="font-family:sans-serif;max-width:480px;margin:auto">
  <h2 style="color:#2456A6;margin-bottom:4px">DespachaGov</h2>
  <p style="color:#F97316;font-weight:600;margin-top:0">${titulo}</p>
  <p>${corpo}</p>
  <p>Protocolo: <b>${ctx.protocolo}</b></p>
  <p><a href="${ctx.link}" style="background:#2456A6;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Abrir no DespachaGov</a></p>
  <p style="color:#6b7488;font-size:12px">Mensagem automática — não responda este e-mail.</p>
</div>`;
  return { subject: `${titulo} — ${ctx.unidadeNome}`, html };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- notificacoes`
Expected: PASS (todos os casos).

- [ ] **Step 5: Lint + commit**

Run: `npx eslint src/lib/notificacoes.ts src/lib/notificacoes.test.ts`
Expected: exit 0.

```bash
git add src/lib/notificacoes.ts src/lib/notificacoes.test.ts
git commit -m "feat(notif): logica pura de e-mail transacional por evento"
```

---

## Task 2: Migration `0007_notificacoes`

**Files:**
- Create: `supabase/migrations/0007_notificacoes.sql`

> Sem teste unitário (SQL/infra). Verificação: aplicar a migration (Task 5) e checar `list_tables`/`get_advisors`.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0007_notificacoes.sql`:

```sql
-- ─── DespachaGov · Migration 0007 — Notificacoes (log de e-mail por evento) ───
-- Log/idempotência do e-mail transacional. Escrita só por service_role (Edge Fn).
-- Leitura para secretaria do tenant (auditoria) + superadmin.

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  evento_id uuid not null references public.chamado_eventos (id) on delete cascade,
  chamado_id uuid not null references public.chamados (id) on delete cascade,
  canal text not null default 'email' check (canal in ('email')),
  destinatario text not null,
  assunto text,
  status text not null check (status in ('enviado','falha')),
  erro text,
  created_at timestamptz not null default now()
);

-- Idempotência: 1 registro por (evento, destinatário, canal).
create unique index notificacoes_dedupe_idx on public.notificacoes (evento_id, destinatario, canal);
create index notificacoes_tenant_idx on public.notificacoes (tenant_id);
create index notificacoes_chamado_idx on public.notificacoes (chamado_id);

alter table public.notificacoes enable row level security;

-- SELECT: secretaria do tenant + superadmin. Sem policy de INSERT/UPDATE:
-- service_role ignora RLS; nenhum papel de usuário escreve aqui.
create policy notificacoes_select on public.notificacoes
  for select to authenticated
  using (
    public.is_superadmin()
    or (tenant_id = public.current_tenant_id()
        and public.current_app_role() in ('admin_secretaria','gestor_secretaria'))
  );
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0007_notificacoes.sql
git commit -m "feat(db): migration 0007 tabela notificacoes + RLS"
```

---

## Task 3: Corrigir remetente em `_shared/email.ts`

**Files:**
- Modify: `supabase/functions/_shared/email.ts:16`

> A função reusa `enviarEmail`. O remetente atual (`@despachagov.com.br`) diverge do domínio verificado no Resend (`@despachagov.com`, já usado por `create-tenant`), o que derrubaria o envio.

- [ ] **Step 1: Edit the sender**

Em `supabase/functions/_shared/email.ts`, trocar a linha do `from`:

De:
```ts
        from: "DespachaGov <nao-responder@despachagov.com.br>",
```
Para:
```ts
        from: "DespachaGov <nao-responder@despachagov.com>",
```

- [ ] **Step 2: Lint + commit**

Run: `npx eslint supabase/functions/_shared/email.ts`
Expected: exit 0.

```bash
git add supabase/functions/_shared/email.ts
git commit -m "fix(email): remetente para dominio verificado .com"
```

---

## Task 4: Edge Function `notify-event`

**Files:**
- Create: `supabase/functions/notify-event/index.ts`

> Sem teste unitário (I/O Deno). A lógica pura já está coberta na Task 1. Verificação de integração na Task 5/6.

- [ ] **Step 1: Write the function**

Create `supabase/functions/notify-event/index.ts`:

```ts
// Edge Function: notify-event
// Disparada por Database Webhook em INSERT de chamado_eventos.
// Resolve destinatários (service_role), deduplica e envia e-mail via Resend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enviarEmail } from "../_shared/email.ts";
import {
  destinatariosDe,
  emailEvento,
  linkPara,
  type EventoChamado,
  type PapelNotificavel,
} from "../../../src/lib/notificacoes.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  if (req.headers.get("x-notify-secret") !== Deno.env.get("NOTIFY_WEBHOOK_SECRET")) {
    return new Response("unauthorized", { status: 401 });
  }

  let body: { record?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return new Response("json", { status: 400 });
  }
  const rec = body.record;
  if (!rec) return new Response("no record", { status: 200 });

  const evento = String(rec.evento ?? "") as EventoChamado;
  const eventoId = String(rec.id ?? "");
  const chamadoId = String(rec.chamado_id ?? "");
  const tenantId = String(rec.tenant_id ?? "");
  const atorId = rec.ator_id ? String(rec.ator_id) : null;

  const papeis = destinatariosDe(evento);
  if (papeis.length === 0 || !chamadoId || !eventoId) {
    return new Response(JSON.stringify({ ok: true, enviados: 0 }), { status: 200 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Carrega chamado + nome da unidade.
  const { data: chamado } = await admin
    .from("chamados")
    .select("numero_protocolo, empresa_id, tecnico_id, solicitante_id, unidades!inner(nome)")
    .eq("id", chamadoId)
    .single();
  if (!chamado) return new Response(JSON.stringify({ ok: true, enviados: 0 }), { status: 200 });

  const c = chamado as Record<string, unknown>;
  const protocolo = String(c.numero_protocolo ?? "");
  const unidadeNome = (c.unidades as { nome?: string } | null)?.nome ?? "Unidade";

  // E-mail do ator (para excluir auto-notificação).
  let atorEmail: string | null = null;
  if (atorId) {
    const { data } = await admin.from("users").select("email").eq("id", atorId).maybeSingle();
    atorEmail = (data?.email as string | undefined)?.toLowerCase() ?? null;
  }

  // Resolve e-mails por papel.
  async function emailsDoPapel(papel: PapelNotificavel): Promise<string[]> {
    if (papel === "empresa") {
      if (!c.empresa_id) return [];
      const { data } = await admin.from("empresas").select("email").eq("id", c.empresa_id).maybeSingle();
      return data?.email ? [data.email as string] : [];
    }
    if (papel === "tecnico") {
      if (!c.tecnico_id) return [];
      const { data } = await admin.from("tecnicos").select("email").eq("id", c.tecnico_id).maybeSingle();
      return data?.email ? [data.email as string] : [];
    }
    if (papel === "responsavel") {
      if (!c.solicitante_id) return [];
      const { data } = await admin.from("users").select("email").eq("id", c.solicitante_id).maybeSingle();
      return data?.email ? [data.email as string] : [];
    }
    const { data } = await admin
      .from("users")
      .select("email")
      .eq("tenant_id", tenantId)
      .eq("role", "admin_secretaria");
    return (data ?? []).map((r) => r.email as string).filter(Boolean);
  }

  // Lista única (email, papel), excluindo o ator.
  const alvos: { email: string; papel: PapelNotificavel }[] = [];
  const vistos = new Set<string>();
  for (const papel of papeis) {
    for (const email of await emailsDoPapel(papel)) {
      const e = email.toLowerCase();
      if (!e || e === atorEmail || vistos.has(e)) continue;
      vistos.add(e);
      alvos.push({ email, papel });
    }
  }

  // Envio best-effort + log idempotente.
  let enviados = 0;
  for (const { email, papel } of alvos) {
    const { data: existente } = await admin
      .from("notificacoes")
      .select("id")
      .eq("evento_id", eventoId)
      .eq("destinatario", email)
      .eq("canal", "email")
      .maybeSingle();
    if (existente) continue;

    const { subject, html } = emailEvento(evento, { protocolo, unidadeNome, link: linkPara(papel) });
    const res = await enviarEmail({ to: email, subject, html });
    if (res.sent) enviados++;
    await admin.from("notificacoes").insert({
      tenant_id: tenantId,
      evento_id: eventoId,
      chamado_id: chamadoId,
      canal: "email",
      destinatario: email,
      assunto: subject,
      status: res.sent ? "enviado" : "falha",
      erro: res.sent ? null : (res.error ?? "erro"),
    });
  }

  return new Response(JSON.stringify({ ok: true, enviados }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
```

- [ ] **Step 2: Lint + build do front (garante que o cross-import não quebra o app)**

Run: `npx eslint supabase/functions/notify-event/index.ts && npm run build`
Expected: eslint exit 0; build ✓ (tsc-app não compila `supabase/`, então a importação `.ts` na função não afeta o build).

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/notify-event/index.ts
git commit -m "feat(notif): edge function notify-event (resolve destinatarios + envia)"
```

---

## Task 5: Aplicar infra (migration + deploy + secret + webhook)

> Via Supabase MCP/CLI no projeto `evdjijvxllhrlkkhrcdi`. Cada passo é verificado.

- [ ] **Step 1: Aplicar a migration**

Aplicar `0007_notificacoes` (MCP `apply_migration` com o SQL da Task 2, ou `supabase db push`).
Verificar: `list_tables` mostra `notificacoes`; `get_advisors(security)` sem novos erros (warnings pré-existentes de `rls_auto_enable` ok).

- [ ] **Step 2: Definir o secret do webhook**

Gerar um valor forte e novo e setar:
```bash
supabase secrets set NOTIFY_WEBHOOK_SECRET=<valor-forte> --project-ref evdjijvxllhrlkkhrcdi
```
(Guardar o valor — é necessário no header do webhook no Step 4.)

- [ ] **Step 3: Deploy da Edge Function (sem verify_jwt)**

```bash
supabase functions deploy notify-event --no-verify-jwt --project-ref evdjijvxllhrlkkhrcdi
```
Verificar: `list_edge_functions` lista `notify-event`. URL = `https://evdjijvxllhrlkkhrcdi.supabase.co/functions/v1/notify-event`.

- [ ] **Step 4: Criar o Database Webhook**

Criar webhook em `public.chamado_eventos`, evento **INSERT**, método POST para a URL da função, com header HTTP `x-notify-secret: <valor-do-Step-2>`. Pode ser via painel (Database → Webhooks) ou via SQL (trigger `supabase_functions.http_request`). Confirmar que o header secreto está presente.

- [ ] **Step 5: Smoke test do header**

Chamar a função sem o header e confirmar **401**:
```bash
curl -s -o /dev/null -w "%{http_code}" -X POST \
  https://evdjijvxllhrlkkhrcdi.supabase.co/functions/v1/notify-event
```
Expected: `401`.

---

## Task 6: Verificação de integração ponta-a-ponta

- [ ] **Step 1: Disparar um evento real**

No app (ou via SQL autorizado), abrir um chamado de teste num tenant com `admin_secretaria` que tenha e-mail válido. Isso grava `chamado_eventos.evento='aberto'` → webhook → função.

- [ ] **Step 2: Conferir o log e o recebimento**

- `get_logs(edge-function)` da `notify-event`: resposta 200, `enviados >= 1`.
- `select * from notificacoes order by created_at desc limit 5` (via MCP `execute_sql`): linha `status='enviado'` para o admin.
- Confirmar e-mail recebido (ou, se Resend bounce, investigar domínio — ver achado do spec).

- [ ] **Step 3: Conferir idempotência**

Reenviar o mesmo payload de webhook (ou reprocessar): não deve criar 2ª linha para o mesmo `(evento_id, destinatario)` nem mandar 2º e-mail. O índice único barra duplicata.

- [ ] **Step 4: Verde final**

Run: `npm test && npm run build && npx eslint .`
Expected: testes passam, build ✓, eslint exit 0.

- [ ] **Step 5: Push**

```bash
git push origin main
```

---

## Notas de execução

- **Dedupe:** check em `notificacoes` antes de enviar + índice único `(evento_id, destinatario, canal)` como rede de segurança. At-most-once por destinatário/evento.
- **`verify_jwt=false`:** o webhook não manda JWT de usuário; a autenticação é o header secreto `x-notify-secret`. Por isso o deploy usa `--no-verify-jwt`.
- **Cross-import `../../../src/lib/notificacoes.ts`:** o bundler do Supabase segue o grafo de imports relativos fora de `functions/`. Se o deploy falhar ao empacotar, fallback: copiar `notificacoes.ts` para `supabase/functions/_shared/` e importar de lá (mantendo o teste apontando para a fonte única). Preferir o cross-import.
- **Remetente:** Task 3 alinha `enviarEmail` ao domínio `.com`. Se o e-mail ainda bouncear, confirmar no Resend qual domínio está realmente verificado (achado do spec).
```
