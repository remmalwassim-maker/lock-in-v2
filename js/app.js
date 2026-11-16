import * as L from './logic.js'
import * as ST from './store.js'
import { S, save, dayRec, uid } from './store.js'
import { nowMs, todayKey, secNow, hhmmNow } from './clock.js'
import { prayerDay, refresh } from './prayer.js'
import { esc, clock, countdown, openSheet, closeSheet, sheetOpen } from './ui.js'
import { renderNow } from './views/now.js'
import { renderToday, nightKey } from './views/today.js'
import { renderTrain, CATS } from './views/train.js'
import { renderWeek } from './views/week.js'
import { renderRules } from './views/rules.js'
import { renderSettings } from './views/settings.js'

const $ = (s) => document.querySelector(s)
const main = $('#main')
let route = { tab: 'now', sub: null }
try { const t = localStorage.getItem('lockin2.tab'); if (['now', 'today', 'train', 'week', 'rules'].includes(t)) route.tab = t } catch {}
let weekSel = null, longFired = false, lastRender = 0, lastKey = todayKey()
let toasts = []

const ctx = () => { const k = todayKey(); return { k, sec: secNow(), pd: prayerDay(k), w: L.weekOf(S.startDate, k) } }

// ---------------- render ----------------
function render() {
  const c = ctx(), y = window.scrollY
  let html
  if (route.sub === 'settings') html = renderSettings()
  else html = { now: renderNow, today: renderToday, train: renderTrain, week: (x) => renderWeek(x, weekSel), rules: renderRules }[route.tab](c)
  main.innerHTML = html
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('sel', b.dataset.tab === route.tab))
  // 3 days missed in a row: full-screen card
  const ov = $('#overlay')
  if (L.inPlan(S.startDate, c.k) && L.threeInRow(S, c.k) && !S.dismissed3[c.k]) {
    ov.innerHTML = `<div class="ov-card"><div class="eyebrow">3 DAYS OFF TRACK</div><h1>Sit down with yourself.</h1><h1 class="amber">Then check in with Claude.</h1><p class="mut">No punishment plan. Say what happened, then restart the normal routine.</p><button class="btn big-btn amberbg wide" data-act="dismiss3">I did. Continue</button></div>`
    ov.hidden = false
  } else { ov.hidden = true; ov.innerHTML = '' }
  renderToasts()
  window.scrollTo(0, y)
  lastRender = Date.now()
}
const renderToasts = () => { $('#toasts').innerHTML = toasts.map((t, i) => `<div class="toast ${t.kind || ''}" data-act="dismissToast" data-i="${i}"><b>${esc(t.title)}</b>${t.body ? `<span>${esc(t.body)}</span>` : ''}</div>`).join('') }
function toast(title, body, kind) { toasts.push({ title, body, kind }); if (toasts.length > 3) toasts.shift(); renderToasts() }
const commit = () => { save(); render() }

// ---------------- helpers for sheets ----------------
const radio = (name, opts, sel) => `<div class="seg">${opts.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${v === sel ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`
const field = (label, inner) => `<label class="fld"><span>${label}</span>${inner}</label>`
const fd = (form) => Object.fromEntries(new FormData(form))

function nightSheet() {
  const c = ctx(), nk = nightKey(c), n = L.getDay(S, nk).night || {}
  openSheet('Night check', `<form data-form="night" data-k="${nk}">
    ${field('Lights-out time', `<input type="time" name="lights" value="${n.lights || hhmmNow()}" required>`)}
    ${field('TikTok minutes today (iOS Screen Time)', `<input type="number" name="tiktok" inputmode="numeric" min="0" value="${n.tiktok ?? ''}" required>`)}
    ${field('Rate the day, 1 to 10', `<input type="number" name="rate" inputmode="numeric" min="1" max="10" value="${n.rate ?? ''}" required>`)}
    ${field('One win', `<input name="win" value="${esc(n.win || '')}" autocomplete="off">`)}
    ${field('What I wasted time on', `<input name="wasted" value="${esc(n.wasted || '')}" autocomplete="off">`)}
    ${field("Tomorrow's one focus", `<input name="focus" value="${esc(n.focus || '')}" autocomplete="off">`)}
    <button class="btn big-btn amberbg wide">Save night check</button></form>`)
}
function tradeSheet() {
  openSheet('Log trade', `<form data-form="trade">
    ${field('Time', `<input type="time" name="time" value="${hhmmNow()}" required>`)}
    ${field('Direction', radio('dir', [['long', 'Long'], ['short', 'Short']], 'long'))}
    ${field('Result', radio('outcome', [['win', 'Win'], ['loss', 'Loss'], ['be', 'Break even']], 'win'))}
    <div class="two">${field('$', `<input name="usd" inputmode="decimal" placeholder="0">`)}${field('R', `<input name="r" inputmode="decimal" placeholder="0">`)}</div>
    ${field('Screenshot link', `<input name="link" type="url" placeholder="https://" autocomplete="off">`)}
    ${field('Followed every rule?', radio('followed', [['yes', 'Yes'], ['no', 'No']], 'yes'))}
    ${field('One-line note', `<input name="note" autocomplete="off">`)}
    <button class="btn big-btn amberbg wide">Save trade</button></form>`)
}
function sessionSheet(id) {
  const s = S.sessions.find((x) => x.id === id) || { date: todayKey(), min: '', cat: CATS[0], reason: '' }
  openSheet(id ? 'Edit session' : 'Add past session', `<form data-form="session" data-id="${id || ''}">
    ${field('Date', `<input type="date" name="date" value="${s.date}" required>`)}
    ${field('Minutes', `<input type="number" name="min" inputmode="numeric" min="1" max="600" value="${s.min}" required>`)}
    ${field('Category', `<select name="cat">${CATS.map((x) => `<option ${x === s.cat ? 'selected' : ''}>${x}</option>`).join('')}</select>`)}
    ${field('Reason (required)', `<input name="reason" value="${esc(s.reason || '')}" required autocomplete="off" placeholder="Why add or change this?">`)}
    <button class="btn big-btn amberbg wide">Save</button>
    ${id ? `<button type="button" class="btn danger wide" data-act="delSession" data-id="${id}">Delete session</button>` : ''}</form>`)
}
function repSheet() {
  openSheet('+1 replay rep', `<form data-form="rep">
    ${field('Zone touch: absorption?', radio('absorption', [['yes', 'Yes'], ['no', 'No']], 'yes'))}
    ${field('Trapped traders?', radio('trapped', [['yes', 'Yes'], ['no', 'No']], 'yes'))}
    ${field('Day type', radio('dayType', [['Trend', 'Trend'], ['Balance', 'Balance']], 'Trend'))}
    ${field('Outcome', radio('outcome', [['Win', 'Win'], ['Loss', 'Loss'], ['No trade', 'No trade']], 'Win'))}
    <button class="btn big-btn amberbg wide">Log rep</button></form>`)
}
function noteSheet(id) {
  const c = ctx(), d = L.getDay(S, c.k)
  openSheet('Note', `<form data-form="note" data-id="${id}">${field('Add a note', `<textarea name="t" rows="3" autocomplete="off">${esc(d.notes[id] || '')}</textarea>`)}<button class="btn big-btn amberbg wide">Save note</button></form>`)
}

// ---------------- actions ----------------
const timerClock = () => L.timerElapsed(S.timer, nowMs())
const actions = {
  tab: (d) => { route = { tab: d.tab, sub: null }; try { localStorage.setItem('lockin2.tab', d.tab) } catch {} ; render(); window.scrollTo(0, 0) },
  tick: (d) => { const k = todayKey(), r = dayRec(k); r.ticks[d.id] = !r.ticks[d.id]; commit() },
  minTick: (d) => { const r = dayRec(todayKey()); r.minTicks[d.id] = !r.minTicks[d.id]; commit() },
  fullDay: () => { dayRec(todayKey()).fullDay = true; commit() },
  prayer: (d) => { const r = dayRec(todayKey()); r.prayers[d.p] = r.prayers[d.p] === d.v ? null : d.v; commit() },
  flex: () => { const k = todayKey(); if (!L.canFlex(S, k)) return; const r = dayRec(k); r.flex = !r.flex; commit() },
  upFajr: () => { const r = dayRec(todayKey()); r.upAfterFajr = !r.upAfterFajr; commit() },
  night: nightSheet,
  prep: (d) => { const r = dayRec(todayKey()); r.prep[d.id] = !r.prep[d.id]; commit() },
  redFolder: () => { const r = dayRec(todayKey()); r.redFolder = !r.redFolder; commit() },
  logTrade: () => { if (L.canLog(S, todayKey()).ok) tradeSheet() },
  cat: (d) => { if (!S.timer.running) { S.timer.cat = d.v; commit() } },
  timerStart: () => { const t = S.timer; if (!t.acc) t.date = todayKey(); t.running = true; t.startedAt = nowMs(); commit() },
  timerPause: () => { const t = S.timer; t.acc = timerClock(); t.running = false; commit() },
  timerStop: () => {
    const t = S.timer, min = Math.round(timerClock() / 60000)
    if (min >= 1) { S.sessions.push({ id: uid(), date: t.date || todayKey(), min, cat: t.cat, reason: '', manual: false }); toast('Session saved', `${min} min · ${t.cat}`) }
    else toast('Under a minute', 'Not saved.')
    S.timer = { ...S.timer, running: false, startedAt: 0, acc: 0, date: '' }; commit()
  },
  addSession: () => sessionSheet(''),
  editSession: (d) => sessionSheet(d.id),
  delSession: (d) => { S.sessions = S.sessions.filter((x) => x.id !== d.id); closeSheet(); commit() },
  addRep: repSheet,
  urgeStart: () => { S.urgeActive = { start: nowMs() }; commit() },
  urgeGaveIn: () => { S.urges.push({ start: S.urgeActive.start, beaten: false }); S.urgeActive = null; commit() },
  weekNav: (d) => { const cur = weekSel ?? L.weekOf(S.startDate, todayKey()); weekSel = Math.min(3, Math.max(0, cur + Number(d.d))); render() },
  toggleReview: () => { S.showReview = !S.showReview; commit() },
  copySummary: async (d) => {
    const text = L.summaryText(S, Number(d.w)); let ok = false
    try { await navigator.clipboard.writeText(text); ok = true } catch {}
    if (!ok) { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { ok = document.execCommand('copy') } catch {} ta.remove() }
    const el = $('#copied'); if (el) el.textContent = ok ? 'Copied. Paste it to Claude.' : 'Copy blocked. Long-press to copy below.'
    if (!ok && el) el.insertAdjacentHTML('afterend', `<textarea class="copybox" rows="8" readonly>${esc(text)}</textarea>`)
  },
  openSettings: () => { route.sub = 'settings'; render(); window.scrollTo(0, 0) },
  closeSettings: () => { route.sub = null; render() },
  notif: (d) => { S.settings.notif[d.id] = !S.settings.notif[d.id]; commit() },
  askNotif: async () => { try { await Notification.requestPermission() } catch {} render() },
  exportFile: () => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ST.exportJSON()], { type: 'application/json' })); a.download = `lock-in-${todayKey()}.json`
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000)
  },
  exportCopy: async () => { let ok = false; try { await navigator.clipboard.writeText(ST.exportJSON()); ok = true } catch {} const m = $('#dataMsg'); if (m) m.textContent = ok ? 'Backup copied.' : 'Copy blocked. Use Export file.' },
  delCheck: (d) => { if (S.settings.checklist.length <= 1) return toast('Keep at least one item', 'An empty checklist would unlock trading.'); S.settings.checklist = S.settings.checklist.filter((i) => i.id !== d.id); commit() },
  resetAsk: () => openSheet('Reset all data', `<p>This deletes every day, session, rep, trade and setting on this phone. It cannot be undone. Export first if unsure.</p><button class="btn danger big-btn wide" data-act="doReset">Delete everything</button><button class="btn ghost wide" data-act="closeSheet">Cancel</button>`),
  doReset: () => { ST.resetAll(); closeSheet(); route = { tab: 'now', sub: null }; weekSel = null; toasts = []; render(); toast('All data reset') },
  closeSheet,
  dismiss3: () => { S.dismissed3[todayKey()] = true; commit() },
  dismissToast: (d) => { toasts.splice(Number(d.i), 1); renderToasts() },
}

const forms = {
  minLine: (f) => { dayRec(todayKey()).minLine = fd(f).line.trim(); commit() },
  startDate: (f) => { S.startDate = fd(f).d; weekSel = null; commit(); toast('Start date saved') },
  checkItem: (f) => { const i = S.settings.checklist.find((x) => x.id === f.dataset.id), t = fd(f).t.trim(); if (i && t) i.text = t; commit() },
  addCheck: (f) => { const t = fd(f).t.trim(); if (t) S.settings.checklist.push({ id: uid(), text: t }); commit() },
  importText: (f) => doImport(fd(f).t),
  note: (f) => { const r = dayRec(todayKey()), t = fd(f).t.trim(); if (t) r.notes[f.dataset.id] = t; else delete r.notes[f.dataset.id]; closeSheet(); commit() },
  night: (f) => {
    const v = fd(f), r = dayRec(f.dataset.k)
    r.night = { saved: true, lights: v.lights, tiktok: Number(v.tiktok), rate: Number(v.rate), win: v.win.trim(), wasted: v.wasted.trim(), focus: v.focus.trim() }
    closeSheet(); commit(); toast('Night check saved', v.focus ? `Tomorrow: ${v.focus}` : '')
  },
  trade: (f) => {
    const k = todayKey(), v = fd(f)
    if (!L.canLog(S, k).ok) { closeSheet(); return render() }
    const r = dayRec(k)
    r.trades.push({ id: uid(), time: v.time, dir: v.dir, outcome: v.outcome, usd: v.usd.trim(), r: v.r.trim(), link: v.link.trim(), followed: v.followed === 'yes', note: v.note.trim(), checklist: true, sim: L.simInfo(S, k).sim })
    closeSheet(); commit()
    if (v.outcome === 'loss') toast('Done. Close the platform.', '', 'bad')
    else if (r.trades.length >= L.MAX_TRADES) toast('Done for today', '', 'bad')
    if (v.followed === 'no') { const nd = L.firstTradingDayFrom(L.addDays(k, 1)); toast('Rule broken', nd === L.addDays(k, 1) ? 'Tomorrow is SIM ONLY.' : `Next trading day (${L.DAY[L.dow(nd)]}) is SIM ONLY.`, 'bad') }
  },
  session: (f) => {
    const v = fd(f), id = f.dataset.id, o = { date: v.date, min: Number(v.min), cat: v.cat, reason: v.reason.trim(), manual: true }
    if (id) Object.assign(S.sessions.find((x) => x.id === id) || {}, o); else S.sessions.push({ id: uid(), ...o })
    closeSheet(); commit()
  },
  rep: (f) => { const v = fd(f); S.reps.push({ id: uid(), ts: nowMs(), absorption: v.absorption === 'yes', trapped: v.trapped === 'yes', dayType: v.dayType, outcome: v.outcome }); closeSheet(); commit() },
}
function doImport(text) {
  const m = $('#dataMsg')
  try { ST.importJSON(text); toast('Imported'); render() } catch (e) { if (m) m.textContent = 'Import failed: ' + e.message }
}

// ---------------- events ----------------
document.addEventListener('click', (e) => {
  if (longFired) { longFired = false; e.preventDefault(); return }
  const t = e.target.closest('[data-act]'); if (!t || t.disabled) return
  if (t.dataset.tab !== undefined && t.dataset.act === 'tab') return actions.tab(t.dataset)
  actions[t.dataset.act]?.(t.dataset, t)
})
document.addEventListener('submit', (e) => { const f = e.target.closest('[data-form]'); if (!f) return; e.preventDefault(); forms[f.dataset.form]?.(f) })
document.addEventListener('change', (e) => {
  if (e.target.dataset.file === 'import' && e.target.files[0]) e.target.files[0].text().then(doImport)
})
// long press = add a note
let lp = null
document.addEventListener('pointerdown', (e) => {
  const t = e.target.closest('[data-long]'); if (!t) return
  clearTimeout(lp); lp = setTimeout(() => { longFired = true; noteSheet(t.dataset.long); if (navigator.vibrate) navigator.vibrate(15) }, 550)
})
for (const ev of ['pointerup', 'pointercancel', 'pointerleave', 'pointermove']) document.addEventListener(ev, () => { clearTimeout(lp); if (longFired && ev !== 'pointermove') setTimeout(() => { longFired = false }, 400) })
document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-long]')) e.preventDefault() })

// ---------------- reminders ----------------
async function fire(r) {
  toast(r.title, '', 'amber')
  try { if ('Notification' in window && Notification.permission === 'granted') { const reg = await navigator.serviceWorker.ready; reg.showNotification('LOCK IN', { body: r.title, tag: r.id, icon: 'icons/icon-192.png' }) } } catch {}
}
function checkReminders(c) {
  const fajr = c.pd?.Fajr ? L.toMin(c.pd.Fajr) : null
  for (const r of L.remindersFor(S, c.k, fajr)) {
    const key = `${c.k}.${r.id}`
    if (S.fired[key] || c.sec < r.at * 60 || c.sec >= r.at * 60 + 300) continue
    S.fired[key] = 1; save(); fire(r)
  }
}

// ---------------- 1 second tick: timers survive lock because everything derives from timestamps ----------------
function tick() {
  const c = ctx(), n = nowMs()
  let stale = false
  document.querySelectorAll('[data-cd]').forEach((el) => { const s = (Number(el.dataset.cd) - n) / 1000; el.textContent = countdown(s); if (s <= 0) stale = true })
  const te = document.querySelector('[data-elapsed]'); if (te) te.textContent = clock(timerClock() / 1000)
  if (S.urgeActive && n - S.urgeActive.start >= L.URGE_MS) { S.urges.push({ start: S.urgeActive.start, beaten: true }); S.urgeActive = null; save(); toast('Urge beaten', 'Ten minutes. Well done.', 'ok'); render() }
  checkReminders(c)
  const typing = document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)
  if (c.k !== lastKey) { lastKey = c.k; render(); return }
  if (!sheetOpen() && !typing && ((stale && Date.now() - lastRender > 3000) || Date.now() - lastRender > 15000)) render()
}
setInterval(tick, 1000)
document.addEventListener('visibilitychange', () => { if (!document.hidden) { tick(); render(); boot() } })

// ---------------- boot ----------------
let booting = false
async function boot() {
  if (booting) return; booting = true
  if (await refresh(todayKey())) render()
  booting = false
}
render(); boot()
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {})
