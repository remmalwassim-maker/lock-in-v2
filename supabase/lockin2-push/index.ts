// LOCK IN v2 push sender. Deployed as the edge function `lockin2-push` on the existing Supabase project.
// - POST {action:'sub'|'state'|'unsub'} from the app (stores the phone's push subscription + reminder toggles)
// - POST {action:'tick'} every minute from pg_cron: sends whatever reminders are due (Europe/London time)
// Secrets used (already set for v1): VAPID_PUBLIC, VAPID_PRIVATE, VAPID_SUBJECT.
import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com', Deno.env.get('VAPID_PUBLIC')!, Deno.env.get('VAPID_PRIVATE')!)

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Content-Type': 'application/json' }
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: cors })
const toMin = (s: string) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const addDays = (k: string, n: number) => { const d = new Date(k + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }

const fajrCache = new Map<string, string>()
async function fajrFor(ymd: string): Promise<string | null> {
  if (fajrCache.has(ymd)) return fajrCache.get(ymd)!
  try {
    const [y, m, d] = ymd.split('-')
    const r = await fetch(`https://api.aladhan.com/v1/timingsByCity/${d}-${m}-${y}?city=London&country=United%20Kingdom&method=15`)
    const f = (await r.json()).data.timings.Fajr.slice(0, 5)
    fajrCache.set(ymd, f); return f
  } catch { return null }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let b: any = {}
  try { b = await req.json() } catch { /* empty */ }

  if (b.action === 'sub' && b.sub?.endpoint && b.sub?.keys) {
    const { error } = await sb.from('lockin2_subs').upsert({ endpoint: b.sub.endpoint, p256dh: b.sub.keys.p256dh, auth: b.sub.keys.auth, notif: b.notif ?? {}, start_date: b.startDate ?? null, tz: b.tz ?? 'Europe/London', night_done: b.nightDone ?? null, no_trade: b.noTrade ?? null })
    return error ? json({ error: error.message }, 500) : json({ ok: true })
  }
  if (b.action === 'state' && b.endpoint) {
    await sb.from('lockin2_subs').update({ notif: b.notif ?? {}, start_date: b.startDate ?? null, night_done: b.nightDone ?? null, no_trade: b.noTrade ?? null }).eq('endpoint', b.endpoint)
    return json({ ok: true })
  }
  if (b.action === 'unsub' && b.endpoint) { await sb.from('lockin2_subs').delete().eq('endpoint', b.endpoint); return json({ ok: true }) }
  if (b.action !== 'tick') return json({ error: 'bad request' }, 400)

  // ---- tick: London clock
  const now = new Date()
  const hhmm = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now)
  const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const dow = new Date(ymd + 'T12:00:00Z').getUTCDay()
  const cur = toMin(hhmm), trading = dow >= 1 && dow <= 4
  const fajr = await fajrFor(ymd)

  const { data: subs, error } = await sb.from('lockin2_subs').select('*')
  if (error) return json({ error: error.message }, 500)
  let sent = 0
  for (const s of subs ?? []) {
    if (s.last_min === ymd + 'T' + hhmm) continue
    const start = s.start_date || '2026-11-17'
    if (ymd < start || ymd > addDays(start, 31)) continue // only during the 30-day plan
    const n = s.notif ?? {}, noTrade = s.no_trade === ymd, out: string[] = []
    if (n.fajr10 && fajr && cur === toMin(fajr) - 10) out.push('Fajr in 10 minutes')
    if (trading && !noTrade) {
      if (n.prep && cur === 835) out.push('Prep in 5')
      if (n.sess && cur === 865) out.push('Session in 5. Checklist first.')
      if (n.stop && cur === 930) out.push('Hard stop. Journal.')
    }
    if (n.phone && cur === 1340) out.push('Phone out in 10')
    if (n.night && cur === 1355 && s.night_done !== ymd) out.push('Night check')
    if (n.sun && dow === 0 && cur === 1080) out.push('Weekly review. Copy summary to Claude.')
    if (!out.length) continue
    await sb.from('lockin2_subs').update({ last_min: ymd + 'T' + hhmm }).eq('endpoint', s.endpoint)
    for (const body of out) {
      try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: 'LOCK IN', body, tag: 'lockin2-' + hm(cur) })); sent++ } catch (e) {
        const c = (e as { statusCode?: number }).statusCode
        if (c === 404 || c === 410) await sb.from('lockin2_subs').delete().eq('endpoint', s.endpoint)
      }
    }
  }
  return json({ ok: true, at: ymd + ' ' + hhmm, checked: subs?.length ?? 0, sent })
})
