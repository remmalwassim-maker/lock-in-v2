-- Run once in Supabase > SQL Editor (same project as v1; v1 tables are untouched).
create table if not exists public.lockin2_subs (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  notif jsonb not null default '{}',
  start_date text,
  tz text,
  night_done text,
  no_trade text,
  last_min text,
  created_at timestamptz default now()
);
alter table public.lockin2_subs enable row level security; -- no policies: only the edge function (service role) can read or write

select cron.schedule('lockin2-push', '* * * * *', $$
  select net.http_post(
    url := 'https://yodkgtcmhpjvxveaxpiv.supabase.co/functions/v1/lockin2-push',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer sb_publishable_w5rNwk7PQnENjOlPhHUYfQ_kw6UrZlK","apikey":"sb_publishable_w5rNwk7PQnENjOlPhHUYfQ_kw6UrZlK"}'::jsonb,
    body := '{"action":"tick"}'::jsonb
  );
$$);
