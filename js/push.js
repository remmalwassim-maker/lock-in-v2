// Real push notifications (work with the app closed, iOS 16.4+ home-screen PWA).
// The phone subscribes with the browser Push API; a Supabase edge function (supabase/lockin2-push) sends the reminders each minute.
import { S, save } from './store.js'
import { todayKey } from './clock.js'
import { getDay } from './logic.js'

const URL = 'https://yodkgtcmhpjvxveaxpiv.supabase.co/functions/v1/lockin2-push'
const KEY = 'sb_publishable_w5rNwk7PQnENjOlPhHUYfQ_kw6UrZlK' // publishable key: public by design
const VAPID_PUBLIC = 'BFLSDOKLWX7aAEoeV5Y6fRi-Ulx0XsBfNbpNW0gwkTrvH6iZ1zyiSDWNEgb25FvZ2Ea1bA0goN0ba9S2sbJiJiU'

const b64 = (s) => { const p = '='.repeat((4 - (s.length % 4)) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, (c) => c.charCodeAt(0)) }
export const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
export const isStandalone = () => window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)

const call = (body) => fetch(URL, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: KEY, Authorization: `Bearer ${KEY}` }, body: JSON.stringify(body) })

function snapshot() {
  const k = todayKey()
  const nights = Object.keys(S.days).filter((d) => S.days[d]?.night?.saved).sort()
  return { notif: S.settings.notif, startDate: S.startDate, tz: 'Europe/London', nightDone: nights.at(-1) || null, noTrade: getDay(S, k).redFolder ? k : null }
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser does not support push')
  if (isIOS() && !isStandalone()) throw new Error('Open from the Home Screen icon first (Share, Add to Home Screen)')
  const perm = await Notification.requestPermission()
  if (perm !== 'granted') throw new Error('Notifications were not allowed')
  const reg = await navigator.serviceWorker.ready
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(VAPID_PUBLIC) }))
  const r = await call({ action: 'sub', sub: sub.toJSON(), ...snapshot() })
  if (!r.ok) throw new Error('Server rejected the subscription (' + r.status + ')')
  S.pushOn = true; save()
}

export async function disablePush() {
  try { const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription(); if (sub) { await call({ action: 'unsub', endpoint: sub.endpoint }); await sub.unsubscribe() } } catch {}
  S.pushOn = false; save()
}

// keep the server in step with toggles, night check and red-folder state (silent if offline)
export async function syncPush() {
  if (!S.pushOn || !pushSupported()) return
  try { const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription(); if (sub) await call({ action: 'state', endpoint: sub.endpoint, ...snapshot() }) } catch {}
}
