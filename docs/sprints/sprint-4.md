# Sprint 4 — Execução em campo

Status: **concluído**.

## Banco (migrations `0005`, `0006`)
- `chamado_anexos` — fotos antes/depois, ofício, comprovante (storage_path no bucket privado).
- `assinaturas` — atesto digital do responsável (dataURL PNG, signatário, geo, ip).
- Bucket privado `chamado-anexos` escopado por `tenant_id`.
- Helper `pode_acessar_chamado()` (SECURITY INVOKER) reaproveitado nas RLS de anexos/assinaturas.
- Hardening: HIBP (senha vazada) habilitado + `password_min_length=8`.

## Frontend
- **SignaturePad** — canvas com toque/mouse, exporta PNG dataURL.
- **ExecucaoChamado** (no detalhe da empresa, quando status = `em_campo`):
  - Upload de **foto antes/depois** (input com `capture="environment"` → câmera no celular), thumbnails.
  - **Concluir com atesto**: nome do signatário + assinatura → salva assinatura, transiciona p/ `concluido` e **gera comprovante PDF** automático.
- **Comprovante PDF** (`html2pdf.js`): protocolo, unidade, datas, descrição, registro fotográfico e assinatura — identidade azul/laranja.

## Serviços
- `src/services/execucao.ts` — anexar arquivo, listar anexos, URL assinada, salvar/obter assinatura.
- `src/lib/comprovante.ts` — geração do PDF.

## Verificação
| Check | Resultado |
|-------|-----------|
| `npm run build` | ✓ |
| `eslint .` | OK |
| advisors | só warnings pré-existentes (`rls_auto_enable`) + DEFINER de helper resolvido |

## Fluxo completo (comprovação)
Empresa marca **em campo** → técnico tira **foto antes** → executa → **foto depois** → responsável **assina** na tela → **Concluir** gera o **comprovante PDF** e o chamado some do mapa ao vivo.

## Próximo (Sprint 5)
Realtime já parcial (mapa + inbox empresa). Falta: push notifications (Capacitor), e-mail transacional por evento (Resend), e PWA offline na abertura.
