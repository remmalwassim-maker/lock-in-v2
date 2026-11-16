// One clock for the whole app. window.__setNow('2026-11-18T14:35:00') fakes the time (survives reload) for testing; __setNow() resets.
import { keyOf, parseKey } from './logic.js'

const KEY = 'lockin2.clockOffset'
let offset = 0
try { offset = Number(sessionStorage.getItem(KEY)) || 0 } catch {}

export const nowMs = () => Date.now() + offset
export const now = () => new Date(nowMs())
export const todayKey = () => keyOf(now())
export const secNow = () => { const d = now(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds() }
export const dayStartMs = (k) => parseKey(k).getTime()
export const hhmmNow = () => { const d = now(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

window.__setNow = (iso) => {
  offset = iso ? new Date(iso).getTime() - Date.now() : 0
  try { sessionStorage.setItem(KEY, String(offset)) } catch {}
  location.reload()
}
