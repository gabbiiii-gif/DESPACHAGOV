# Módulo Escola — pacote de extração

Código completo do módulo Escola do FrostERP, copiado **verbatim** (sem alterações) para
reaproveitar em outro sistema. Esta pasta é **aditiva** — nada do projeto original foi modificado.

## 1. Arquivos copiados (verbatim)

```
escola-export/
├── lib/
│   ├── escola.js               # domínio puro: CRUD, transições, métricas, validarOficio
│   ├── escola.test.js          # testes Vitest do domínio
│   ├── escola-relatorio.js     # geração de relatório (HTML imprimível + CSV)
│   └── escola-relatorio.test.js
└── modules/
    ├── EscolaModule.jsx         # painel interno (admin/gerente/técnico)
    └── EscolaPortalVanda.jsx    # portal externo isolado da cliente (role cliente_escola)
```

> Caminhos originais: `src/lib/*` e `src/modules/*`. No projeto original os módulos importam
> `../lib/escola.js`, `../lib/escola-relatorio.js`, `../utils.js` e `../supabase.js`. Ajuste os
> imports conforme a estrutura do novo sistema.

## 2. Dependências externas que os arquivos esperam

### 2.1 De `utils.js`
- `genId()` — gera id único (base36). Usado em `escola.js`.
- `formatDate(iso)` — formata data pt-BR. Usado nos dois módulos.

### 2.2 De `supabase.js` (camada de sync/cloud)
Os módulos chamam três helpers. Copie-os para o `supabase.js` do novo sistema:

- `notifyEscolaEvent(companyId, evento, demanda)` — dispara email via edge function `notify-escola-event`.
- `uploadEscolaOficio(file, demandaId)` — upload de anexo ao bucket `escola-oficios`.
- Regra de escopo de escrita (`canWriteKey`) para a role `cliente_escola`.

Os corpos verbatim estão na seção **4 (Glue)** abaixo.

### 2.3 Contrato do `db` (injetado por prop)
Os módulos recebem `db` com a interface:

```js
db.get(key)            // → objeto | null
db.set(key, value)     // grava (e idealmente sincroniza com cloud)
db.delete(key)         // remove
db.list(prefix)        // → array de valores cujas chaves começam com prefix
```

No FrostERP isso é a camada `DB` sobre `window.storage` (localStorage) com sync ao Supabase
`kv_store`. No novo sistema, qualquer implementação que respeite esse contrato serve (inclusive
um Map em memória — ver `escola.test.js`).

### 2.4 Convenções de chave (kv)
- Demanda:  `erp:escola:<uuid>`
- Evento/timeline: `erp:evento_escola:<uuid>`

Anexos de ofício ficam embutidos na demanda: `demanda.oficios = [{ url, nome, tipo, tamanho }]`.

## 3. Props dos componentes

```jsx
// Portal externo (a cliente Vanda)
<EscolaPortalVanda
  user={user}          // { id, nome|email, companyId, companyName, role:'cliente_escola' }
  onLogout={fn}
  addToast={fn}        // ({ type, message }) => void
  db={DB}
/>

// Painel interno (equipe)
<EscolaModule
  user={user}          // role admin|gerente|tecnico
  addToast={fn}
  reloadData={fn}      // recarrega dados globais após mutação
  db={DB}
/>
```

## 4. Glue de integração (trechos verbatim do projeto original)

### 4.1 `constants.js` — ROLE_PERMISSIONS

```js
// gerente (e admin) enxergam o módulo interno "escola"
gerente: ["dashboard", "clientes", "funcionarios", "financeiro", "os", "agenda", "config", "ia", "folha", "pos-venda", "ponto", "escola", "lembrete"],

// Role exclusiva do portal da Vanda. Único módulo: "escola-portal".
// Render branch em App.jsx detecta esta role e mostra EscolaPortalVanda.
cliente_escola: ["escola-portal"],
```

### 4.2 `App.jsx` — imports

```js
import EscolaModule from "./modules/EscolaModule.jsx";
import EscolaPortalVanda from "./modules/EscolaPortalVanda.jsx";
```

### 4.3 `App.jsx` — roteamento por role (render branch antes do shell do ERP)

```jsx
// ─── Roteamento por role: cliente_escola (Vanda) vê portal isolado ───
// Portal externo para a cliente Vanda solicitar e acompanhar demandas.
// NÃO tem sidebar, NÃO tem acesso a OS, financeiro nem cadastros.
if (user.role === "cliente_escola") {
  return (
    <>
      <ToastContainer toasts={toasts} removeToast={(id) => setToasts((prev) => prev.filter((x) => x.id !== id))} />
      <EscolaPortalVanda user={user} onLogout={handleLogout} addToast={addToast} db={DB} />
    </>
  );
}
```

### 4.4 `App.jsx` — render do módulo interno no shell (por activeModule)

```jsx
{activeModule === "escola" && (
  <EscolaModule user={user} addToast={addToast} reloadData={loadAllData} db={DB} />
)}
```

### 4.5 `App.jsx` — opção de role no cadastro de usuário (UserManagement)

```jsx
{/* Role da cliente externa Vanda: cai no portal isolado EscolaPortalVanda (sem ERP). */}
<option value="cliente_escola">Cliente Escola (Portal Vanda)</option>
```

### 4.6 `App.jsx` — SCOPED_PREFIXES (multi-tenant: chaves escopadas por empresa)

```js
const SCOPED_PREFIXES = [
  // ...
  "erp:escola:",
  "erp:evento_escola:",
];
```

### 4.7 `supabase.js` — escopo de escrita da role cliente_escola (canWriteKey)

```js
if (role === 'cliente_escola') {
  return key.startsWith('erp:escola:') || key.startsWith('erp:evento_escola:');
}
```

### 4.8 `supabase.js` — notifyEscolaEvent (verbatim)

```js
export async function notifyEscolaEvent(companyId, evento, demanda) {
  if (!supabase || !companyId || !evento || !demanda) {
    return { ok: false, error: 'params' };
  }
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { ok: false, error: 'no_session' };
    const resp = await fetch(`${supabaseUrl}/functions/v1/notify-escola-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ companyId, evento, demanda }),
      keepalive: true,
    });
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok || !body.ok) {
      return { ok: false, error: body.error || `HTTP ${resp.status}` };
    }
    return {
      ok: true,
      sent_to: body.sent_to,
      total_recipients: body.total_recipients,
      skipped: body.skipped,
      errors: body.errors,
    };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
```

### 4.9 `supabase.js` — uploadEscolaOficio (verbatim)

Depende de `SIGNED_URL_TTL` (`const SIGNED_URL_TTL = 60 * 60 * 24 * 365 * 5;`) e `getCompanyId()`.

```js
export async function uploadEscolaOficio(file, demandaId) {
  if (!supabase) return null;
  const companyId = getCompanyId();
  if (!companyId) { console.warn('uploadEscolaOficio: sem company_id.'); return null; }
  try {
    const ext = (file.name || 'oficio').split('.').pop();
    const ts = Date.now();
    const path = `${companyId}/${demandaId}/${ts}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('escola-oficios')
      .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
    if (upErr) { console.warn('Upload ofício erro:', upErr.message); return null; }
    const { data, error: signErr } = await supabase.storage.from('escola-oficios').createSignedUrl(path, SIGNED_URL_TTL);
    if (signErr) { console.warn('Signed URL ofício erro:', signErr.message); return null; }
    return data?.signedUrl || null;
  } catch (err) {
    console.warn('Upload ofício falhou:', err.message);
    return null;
  }
}
```

## 5. Infra Supabase necessária

### 5.1 Bucket de Storage `escola-oficios` (privado)
Criar manualmente no Dashboard (Storage → New bucket → Private) **ou** via SQL:

```sql
-- Bucket privado
insert into storage.buckets (id, name, public)
values ('escola-oficios', 'escola-oficios', false)
on conflict (id) do nothing;

-- RLS de pasta escopada por company_id (foldername[1] = company_id)
create policy "escola_oficios_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'escola-oficios' and (storage.foldername(name))[1] = (auth.jwt() ->> 'company_id'));

create policy "escola_oficios_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'escola-oficios' and (storage.foldername(name))[1] = (auth.jwt() ->> 'company_id'));
```

> Ajuste a fonte de `company_id` (claim JWT vs. tabela `company_members`) ao modelo do novo
> sistema. No FrostERP o path é `${companyId}/${demandaId}/arquivo`.

### 5.2 Edge function `notify-escola-event` (opcional)
Só necessária se quiser email em mudança de status. Não está nesta pasta (vive em
`supabase/functions/notify-escola-event` no projeto original). Se não quiser email, remova as
chamadas a `notifyEscolaEvent` dos dois módulos — o restante funciona sem ela.

### 5.3 `kv_store`
Os módulos persistem via o contrato `db` (seção 2.3). No FrostERP isso mapeia para a tabela
`kv_store (key, value, updated_at, company_id)`. Em outro sistema, qualquer storage que respeite
`get/set/delete/list(prefix)` serve.

## 6. Testes
`escola.test.js` e `escola-relatorio.test.js` usam Vitest + um `db` em memória (Map). Rodam
isolados, sem Supabase. Bons como contrato/documentação viva do domínio.
```bash
npx vitest run escola-export/lib/escola.test.js escola-export/lib/escola-relatorio.test.js
```
> Ajuste os imports nos `.test.js` (`./escola.js`) se mover os arquivos.

## 7. Resumo de funcionalidades
- Criação/listagem/acompanhamento de demandas (portal externo da cliente).
- Anexo opcional de ofícios (PDF/imagem, múltiplos, preview) → bucket `escola-oficios`.
- Painel interno: filtros, KPIs, detalhe + timeline, ações (assumir/concluir/cancelar).
- Relatórios (PDF imprimível + CSV) com presets semana/mês/personalizado e filtro por escola.
- Transições de status validadas no domínio (defesa em profundidade).
