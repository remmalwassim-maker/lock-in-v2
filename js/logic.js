// Pure rules and maths for LOCK IN v2. No DOM, no storage: everything here is unit-tested.
// "state" is the object from store.js: { startDate, settings, days, sessions, reps, urges, ... }

export const PLAN_DAYS = 30
export const DEFAULT_START = '2026-11-17'
export const GOAL_DATE = '2027-03-31'
export const REPS_TARGET = 20
export const MAX_TRADES = 2
export const TRAIN_DAY_MIN = 180
export const URGE_MS = 10 * 60 * 1000
export const NN = ['fajr', 'phone', 'trading', 'move', 'night'] // the 5 non-negotiables
export const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha']

// Week-by-week targets. phoneBy = deadline for phone charging outside the room.
export const WEEKS = [
  { lights: '00:30', tiktok: 180, up: null, phoneBy: '00:30' },
  { lights: '00:00', tiktok: 120, up: null, phoneBy: '22:30' },
  { lights: '23:30', tiktok: 90, up: 2, phoneBy: '22:30' },
  { lights: '23:00', tiktok: 60, up: 4, phoneBy: '22:30' },
]

// ---------- dates (all keys are local-time YYYY-MM-DD) ----------
const pad = (n) => String(n).padStart(2, '0')
export const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d) }
export const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d) }
export const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5)
export const dow = (k) => parseKey(k).getDay() // 0 = Sunday
export const toMin = (s) => { const [h, m] = String(s).split(':').map(Number); return h * 60 + m }
export const hm = (m) => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(Math.round(((m % 1440) + 1440) % 60))}`
export const fmtMin = (m) => { m = Math.round(m); const h = Math.floor(m / 60); return h ? `${h}h ${pad(m % 60)}m` : `${m}m` }
export const fmtLeft = (sec) => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60; return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}` }
export const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const prettyDate = (k) => { const d = parseKey(k); return `${DAY[d.getDay()].slice(0, 3)} ${d.getDate()} ${MON[d.getMonth()]}` }

export const dayIndex = (start, k) => diffDays(start, k)
export const inPlan = (start, k) => { const i = dayIndex(start, k); return i >= 0 && i < PLAN_DAYS }
export const weekOf = (start, k) => Math.min(3, Math.max(0, Math.floor(dayIndex(start, k) / 7)))
export function weekDates(start, w) {
  const s = addDays(start, w * 7), e = w === 3 ? addDays(start, PLAN_DAYS - 1) : addDays(s, 6), out = []
  for (let k = s; k <= e; k = addDays(k, 1)) out.push(k)
  return out
}

// ---------- day records ----------
export const emptyDay = () => ({ ticks: {}, notes: {}, prayers: {}, upAfterFajr: false, night: null, minTicks: {}, minLine: '', fullDay: false, prep: {}, redFolder: false, trades: [] })
export const getDay = (state, k) => ({ ...emptyDay(), ...(state.days[k] || {}) })
export const isTradingDay = (k) => { const d = dow(k); return d >= 1 && d <= 4 } // Mon-Thu
export const tradingNeeded = (state, k) => isTradingDay(k) && !getDay(state, k).redFolder

// ---------- the 5 non-negotiables ----------
export function tickValue(state, k, id) {
  const d = getDay(state, k)
  if (id === 'trading' && !tradingNeeded(state, k)) return true // n/a days count as done
  if (id === 'night') return !!(d.night && d.night.saved)
  return !!d.ticks[id]
}
export const tickCount = (state, k) => NN.filter((id) => tickValue(state, k, id)).length
export const minDone = (d) => !!(d.minTicks.fajr && d.minTicks.phone && String(d.minLine || '').trim())

// Minimum Day: yesterday (inside the plan) was not kept, and today isn't overridden with "full day".
export function minModeActive(state, k) {
  if (dayIndex(state.startDate, addDays(k, -1)) < 0) return false
  if (getDay(state, k).fullDay) return false
  return !dayKept(state, addDays(k, -1))
}
// A day is kept with 3+ of 5 ticks, or (in Minimum Day mode) the 3 minimum ticks.
export function dayKept(state, k) {
  if (tickCount(state, k) >= 3) return true
  return minModeActive(state, k) && minDone(getDay(state, k))
}
export function threeInRow(state, k) {
  for (let i = 1; i <= 3; i++) {
    const y = addDays(k, -i)
    if (dayIndex(state.startDate, y) < 0 || dayKept(state, y)) return false
  }
  return true
}
export const effTicks = (state, k) => Math.max(tickCount(state, k), minModeActive(state, k) && minDone(getDay(state, k)) ? 3 : 0)

// ---------- training ----------
export const trainMin = (state, k) => (state.sessions || []).filter((s) => s.date === k).reduce((a, s) => a + s.min, 0)
export const timerElapsed = (t, nowMs) => (t.acc || 0) + (t.running ? nowMs - t.startedAt : 0) // never counts ticks
export function dayScore(state, k) {
  const t = effTicks(state, k)
  const wd = dow(k) >= 1 && dow(k) <= 5
  const tr = Math.min(1, trainMin(state, k) / TRAIN_DAY_MIN)
  return Math.round(wd ? 70 * (t / 5) + 30 * tr : 100 * (t / 5))
}

// ---------- trading rules ----------
export function tradingState(state, k) {
  const d = getDay(state, k), w = dow(k)
  if (w === 5) return { open: false, code: 'friday', msg: 'No trading Friday' }
  if (w === 0 || w === 6) return { open: false, code: 'weekend', msg: 'No trading today' }
  if (d.redFolder) return { open: false, code: 'news', msg: 'No trading today. Red-folder news day.' }
  if (d.trades.some((t) => t.outcome === 'loss')) return { open: false, code: 'loss', msg: 'Done. Close the platform.' }
  if (d.trades.length >= MAX_TRADES) return { open: false, code: 'max', msg: 'Done for today' }
  return { open: true, code: 'open', msg: '' }
}
export const prepDone = (state, k) => { const d = getDay(state, k); return (state.settings.checklist || []).every((i) => d.prep[i.id]) }
export function canLog(state, k) {
  const t = tradingState(state, k)
  if (!t.open) return { ok: false, msg: t.msg }
  if (!prepDone(state, k)) return { ok: false, msg: 'Tick every prep item first' }
  return { ok: true, msg: '' }
}
export const firstTradingDayFrom = (k) => { while (!isTradingDay(k)) k = addDays(k, 1); return k }
// SIM ONLY: a rule-break trade flags the next trading day (banner starts the very next day).
export function simInfo(state, k) {
  let sim = false, banner = null
  for (const b of Object.keys(state.days)) {
    if (b >= k || !getDay(state, b).trades.some((t) => t.followed === false)) continue
    const f = addDays(b, 1), s = firstTradingDayFrom(f)
    if (k === s) { sim = true; banner = 'SIM ONLY today. A rule was broken.' }
    else if (k === f && !banner) banner = `SIM ONLY next trading day (${DAY[dow(s)]}). A rule was broken.`
  }
  return { sim, banner }
}

// ---------- routine, anchors, reminders ----------
export function blocksFor(k, fajrMin, week) {
  const dw = dow(k), weekday = dw >= 1 && dw <= 5, trading = dw >= 1 && dw <= 4, B = []
  const add = (id, label, start, end, sub = '') => B.push({ id, label, start, end, sub })
  if (fajrMin != null) add('fajr', 'FAJR WINDOW', fajrMin, 480, week < 2 ? 'Pray on time. Back to sleep is allowed.' : 'Pray on time. Stay up.')
  add('up', 'UP. NO PHONE', 480, 510, 'First 30 minutes with no phone.')
  if (weekday) {
    add('uni', 'UNI', 540, 780)
    if (trading) {
      add('prep', 'PREP', 840, 870, 'Checklist first.')
      add('session', 'TRADING SESSION', 870, 930, 'Hard stop at 15:30, or 2 trades.')
      add('journal', 'JOURNAL', 930, 960, 'Journal every trade.')
    } else add('review', 'REVIEW DAY', 840, 960, 'No trading. Review the week.')
    add('gym', 'GYM OR WALK', 975, 1050, 'Back-safe.')
    add('focus', 'FOCUS BLOCK', 1080, 1200, 'One thing only.')
  }
  // Work only. No scheduled breaks or free time: those are earned (see workLeft).
  add('phone', 'PHONE OUT', 1350, 1440, 'Phone outside the room. Sleep.')
  return B
}
export function currentBlock(blocks, sec) {
  const m = sec / 60
  const b = blocks.find((x) => m >= x.start && m < x.end)
  if (b) return { ...b, left: b.end * 60 - sec }
  const nx = blocks.find((x) => x.start > m)
  if (nx === blocks[0]) return { id: 'night', label: 'PHONE OUT', sub: 'Sleep.', start: 0, end: nx.start, left: nx.start * 60 - sec }
  return { id: 'gap', label: 'OPEN', sub: '', start: m, end: nx ? nx.start : 1440, left: (nx ? nx.start * 60 : 86400) - sec, next: nx }
}
// What's still owed today. Empty = work done = break and free time are earned.
export function workLeft(state, k) {
  const out = []
  if (!tickValue(state, k, 'fajr')) out.push('Fajr')
  if (tradingNeeded(state, k) && !tickValue(state, k, 'trading')) out.push('trading checklist + journal')
  if (!tickValue(state, k, 'move')) out.push('move 20 min')
  const wd = dow(k) >= 1 && dow(k) <= 5
  if (wd && trainMin(state, k) < TRAIN_DAY_MIN) out.push(`${fmtMin(TRAIN_DAY_MIN - trainMin(state, k))} training`)
  return out
}
// Anchors for the "next" countdown. prayer = { Fajr:'05:17', Maghrib:'16:33', ... } for that day.
export function anchorsFor(k, prayerDay) {
  const A = []
  const p = (n) => (prayerDay && prayerDay[n] ? toMin(prayerDay[n]) : null)
  if (p('Fajr') != null) A.push({ label: 'Fajr', at: p('Fajr') })
  if (isTradingDay(k)) { A.push({ label: 'Prep', at: 840 }); A.push({ label: 'Session', at: 870 }) }
  if (p('Maghrib') != null) A.push({ label: 'Maghrib', at: p('Maghrib') })
  A.push({ label: 'Phone out', at: 1350 })
  return A.sort((a, b) => a.at - b.at)
}
export function remindersFor(state, k, fajrMin) {
  const n = state.settings.notif, d = getDay(state, k), L = []
  const trading = tradingNeeded(state, k)
  if (n.fajr10 && fajrMin != null) L.push({ id: 'fajr10', at: fajrMin - 10, title: 'Fajr in 10 minutes' })
  if (n.prep && trading) L.push({ id: 'prep', at: 835, title: 'Prep in 5' })
  if (n.sess && trading) L.push({ id: 'sess', at: 865, title: 'Session in 5. Checklist first.' })
  if (n.stop && trading) L.push({ id: 'stop', at: 930, title: 'Hard stop. Journal.' })
  if (n.phone) L.push({ id: 'phone', at: 1340, title: 'Phone out in 10' })
  if (n.night && !(d.night && d.night.saved)) L.push({ id: 'night', at: 1355, title: 'Night check' })
  if (n.sun && dow(k) === 0) L.push({ id: 'sun', at: 1080, title: 'Weekly review. Copy the summary to Claude.' })
  return L
}

// ---------- weekly numbers ----------
const norm = (m) => (m < 720 ? m + 1440 : m) // 00:30 sorts after 23:30
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
export function weekStats(state, w) {
  const dates = weekDates(state.startDate, w), ds = dates.map((k) => getDay(state, k))
  const trades = ds.flatMap((d) => d.trades)
  const nights = ds.filter((d) => d.night && d.night.saved)
  const inWindow = (u) => dates.includes(keyOf(new Date(u.start)))
  const urges = (state.urges || []).filter(inWindow)
  return {
    n: dates.length,
    weekdays: dates.filter((k) => dow(k) >= 1 && dow(k) <= 5).length,
    fajrOn: ds.filter((d) => d.prayers.fajr === 'on').length,
    prayersOn: ds.reduce((a, d) => a + PRAYERS.filter((p) => d.prayers[p] === 'on').length, 0),
    lightsAvg: avg(nights.filter((d) => d.night.lights).map((d) => norm(toMin(d.night.lights)))),
    tiktokAvg: avg(nights.filter((d) => d.night.tiktok !== '' && d.night.tiktok != null).map((d) => Number(d.night.tiktok))),
    trainMin: dates.reduce((a, k) => a + trainMin(state, k), 0),
    repsTotal: (state.reps || []).length,
    ruleBreaks: trades.filter((t) => t.followed === false).length,
    tradesTotal: trades.length,
    tradesChecklist: trades.filter((t) => t.checklist).length,
    moveDays: ds.filter((d) => d.ticks.move).length,
    nightChecks: nights.length,
    upAfter: ds.filter((d) => d.upAfterFajr).length,
    urgesTotal: urges.length,
    urgesBeaten: urges.filter((u) => u.beaten).length,
  }
}
export function weekRows(state, w) {
  const s = weekStats(state, w), T = WEEKS[w], rows = []
  const row = (label, now, target, ok) => rows.push({ label, now, target, ok })
  row('Fajr on time', `${s.fajrOn}/${s.n}`, String(s.n), s.fajrOn >= s.n)
  const pt = Math.round((s.n * 25) / 7)
  row('All prayers on time', `${s.prayersOn}/${s.n * 5}`, `${pt}+`, s.prayersOn >= pt)
  row('Average lights-out', s.lightsAvg == null ? '-' : hm(s.lightsAvg), `by ${T.lights}`, s.lightsAvg == null ? null : s.lightsAvg <= norm(toMin(T.lights)))
  row('Average TikTok', s.tiktokAvg == null ? '-' : fmtMin(s.tiktokAvg), `max ${fmtMin(T.tiktok)}`, s.tiktokAvg == null ? null : s.tiktokAvg <= T.tiktok)
  if (T.up != null) row('Up after Fajr', `${s.upAfter} days`, `${T.up}+`, s.upAfter >= T.up)
  const th = 3 * s.weekdays
  row('Training hours', `${(s.trainMin / 60).toFixed(1)}h`, `${th}h+`, s.trainMin >= th * 60)
  row('Replay reps (total)', String(s.repsTotal), `${REPS_TARGET} by 16 Dec`, s.repsTotal >= REPS_TARGET)
  row('Trading rule breaks', String(s.ruleBreaks), '0', s.ruleBreaks === 0)
  row('Trades with checklist', s.tradesTotal ? `${s.tradesChecklist}/${s.tradesTotal}` : '-', 'all', s.tradesTotal ? s.tradesChecklist === s.tradesTotal : null)
  row('Movement days', `${s.moveDays}/${s.n}`, String(s.n), s.moveDays >= s.n)
  row('Night checks', `${s.nightChecks}/${s.n}`, String(s.n), s.nightChecks >= s.n)
  row('Urges beaten', s.urgesTotal ? `${s.urgesBeaten}/${s.urgesTotal}` : '0', '-', null)
  return rows
}

// ---------- summary text (for pasting to Claude) ----------
export function summaryText(state, w) {
  const dates = weekDates(state.startDate, w), T = WEEKS[w]
  const L = [`LOCK IN v2 - Week ${w + 1} (${prettyDate(dates[0])} to ${prettyDate(dates.at(-1))})`, `Targets: lights-out ${T.lights}, TikTok max ${fmtMin(T.tiktok)}${T.up != null ? `, up after Fajr ${T.up}+ days` : ''}`, '']
  for (const r of weekRows(state, w)) L.push(`${r.ok === true ? '[ok]' : r.ok === false ? '[miss]' : '[-]'} ${r.label}: ${r.now} (target ${r.target})`)
  L.push('', 'Day by day (score, ticks, training):')
  for (const k of dates) {
    const d = getDay(state, k)
    L.push(`${prettyDate(k)}: score ${dayScore(state, k)}, ${effTicks(state, k)}/5, ${(trainMin(state, k) / 60).toFixed(1)}h${d.night?.saved ? `, lights-out ${d.night.lights}, TikTok ${d.night.tiktok}m, rated ${d.night.rate}/10` : ''}`)
  }
  const wins = dates.map((k) => [k, getDay(state, k).night?.win]).filter((x) => x[1])
  const wasted = dates.map((k) => [k, getDay(state, k).night?.wasted]).filter((x) => x[1])
  if (wins.length) L.push('', 'Wins:', ...wins.map(([k, t]) => `- ${prettyDate(k)}: ${t}`))
  if (wasted.length) L.push('', 'Wasted time on:', ...wasted.map(([k, t]) => `- ${prettyDate(k)}: ${t}`))
  const tr = dates.flatMap((k) => getDay(state, k).trades.map((t) => ({ k, ...t })))
  if (tr.length) L.push('', 'Trades:', ...tr.map((t) => `- ${prettyDate(t.k)} ${t.time} ${t.dir} ${t.outcome}${t.usd !== '' && t.usd != null ? ` $${t.usd}` : ''}${t.r !== '' && t.r != null ? ` ${t.r}R` : ''}${t.followed === false ? ' RULE BROKEN' : ''}${t.sim ? ' (sim)' : ''}${t.note ? ` - ${t.note}` : ''}`))
  return L.join('\n')
}

// ---------- 30-day review ----------
export function reviewItems(state) {
  const all = [0, 1, 2, 3].map((w) => ({ w, rows: weekRows(state, w) }))
  const last = all[3].rows
  const held = last.filter((r) => r.ok === true), notHeld = last.filter((r) => r.ok === false)
  const days = Array.from({ length: PLAN_DAYS }, (_, i) => addDays(state.startDate, i))
  return { held, notHeld, kept: days.filter((k) => dayKept(state, k)).length, days: PLAN_DAYS, avgScore: Math.round(days.reduce((a, k) => a + dayScore(state, k), 0) / PLAN_DAYS) }
}
