// London prayer times from Aladhan (Moonsighting Committee = method 15), cached in localStorage for offline use.
import { addDays, parseKey, keyOf } from './logic.js'

const KEY = 'lockin2.prayer'
const NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
let cache = {}
try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') } catch {}

export const prayerDay = (k) => cache[k] || null
export const hasRange = (from, days) => { for (let i = 0; i < days; i++) if (!cache[addDays(from, i)]) return false; return true }

const strip = (t) => String(t).slice(0, 5) // "05:17 (GMT)" -> "05:17"

async function fetchMonth(y, m) {
  const r = await fetch(`https://api.aladhan.com/v1/calendarByCity/${y}/${m}?city=London&country=United%20Kingdom&method=15`)
  if (!r.ok) throw new Error('aladhan ' + r.status)
  const j = await r.json()
  for (const e of j.data || []) {
    const [dd, mm, yy] = e.date.gregorian.date.split('-')
    const k = `${yy}-${mm}-${dd}`
    cache[k] = Object.fromEntries(NAMES.map((n) => [n, strip(e.timings[n])]))
  }
}

// Make sure today + the next 30 days are cached. Returns true if anything new was fetched.
export async function refresh(todayK) {
  if (hasRange(todayK, 31)) return false
  const months = new Set()
  for (let i = 0; i <= 31; i += 1) { const d = parseKey(addDays(todayK, i)); months.add(`${d.getFullYear()}/${d.getMonth() + 1}`) }
  try {
    for (const ym of months) { const [y, m] = ym.split('/'); await fetchMonth(y, m) }
    // keep the cache small: drop days older than 7 days
    const cut = addDays(todayK, -7)
    for (const k of Object.keys(cache)) if (k < cut) delete cache[k]
    try { localStorage.setItem(KEY, JSON.stringify(cache)) } catch {}
    return true
  } catch { return false } // offline: keep whatever is cached
}
export const cachedDays = () => Object.keys(cache).length
