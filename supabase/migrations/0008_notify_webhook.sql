-- ─── DespachaGov · Migration 0008 — Disparo de notificações (trigger pg_net) ──
-- INSERT em chamado_eventos → POST para a Edge Function notify-event.
-- Secret gerado no banco (sem literal no git), lido em runtime pelo trigger e
-- validado pela função. service_role/owner ignoram RLS; ninguém mais lê o secret.

create extension if not exists pg_net;

create table public.notify_config (
  id int primary key default 1,
  webhook_secret text not null default encode(gen_random_bytes(32), 'hex'),
  constraint notify_config_singleton check (id = 1)
);
insert into public.notify_config (id) values (1) on conflict (id) do nothing;

alter table public.notify_config enable row level security;
-- Sem policies: apenas service_role/owner (que ignoram RLS) acessam.
revoke all on public.notify_config from anon, authenticated;

create or replace function public.tg_notify_chamado_evento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_secret text;
  v_url text := 'https://evdjijvxllhrlkkhrcdi.supabase.co/functions/v1/notify-event';
begin
  select webhook_secret into v_secret from public.notify_config where id = 1;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', v_secret),
    body := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end $$;

create trigger chamado_eventos_notify
  after insert on public.chamado_eventos
  for each row execute function public.tg_notify_chamado_evento();
