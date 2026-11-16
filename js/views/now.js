import * as L from '../logic.js'
import { S } from '../store.js'
import { esc, ring, countdown } from '../ui.js'
import { prayerDay } from '../prayer.js'
import { dayStartMs, nowMs } from '../clock.js'

export function banners(c) {
  const { k } = c, out = []
  const sim = L.simInfo(S, k)
  if (sim.banner) out.push(`<div class="banner ${sim.sim ? 'bad' : 'warn'}"><b>${sim.sim ? 'SIM ONLY' : 'HEADS UP'}</b><span>${esc(sim.banner)}</span></div>`)
  if (L.getDay(S, k).redFolder) out.push(`<div class="banner warn"><b>NO TRADING</b><span>Red-folder news day.</span></div>`)
  if (L.minModeActive(S, k)) out.push(`<div class="banner bad"><b>NEVER MISS TWICE</b><span>Minimum Day mode: Fajr, one line, phone out. That keeps the day.</span></div>`)
  return out.join('')
}

export function renderNow(c) {
  const { k, sec, pd, w } = c
  const idx = L.dayIndex(S.startDate, k)
  const fajrMin = pd?.Fajr ? L.toMin(pd.Fajr) : null
  const blocks = L.blocksFor(k, fajrMin, w)
  const cur = L.currentBlock(blocks, sec)
  const base = dayStartMs(k)
  let label = cur.label, sub = cur.sub
  if (['prep', 'session', 'journal'].includes(cur.id)) {
    const t = L.tradingState(S, k)
    if (!t.open && cur.id !== 'journal') { label = t.msg.toUpperCase(); sub = '' }
    else if (cur.id === 'prep') {
      const d = L.getDay(S, k), n = S.settings.checklist.filter((i) => d.prep[i.id]).length
      sub = `Checklist ${n}/${S.settings.checklist.length}. Tick it in Train.`
    }
  }
  let earned = false
  if (cur.id === 'gap') {
    const left = L.workLeft(S, k)
    earned = !left.length
    label = earned ? 'EARNED' : 'WORK FIRST'
    sub = earned ? 'Work is done. Break and free time are yours.' : `Left: ${left.join(', ')}. Your call, but work first.`
  }
  const endMs = base + cur.end * 60000 + (cur.id === 'night' && cur.start === 0 ? 0 : 0)
  const goal = L.diffDays(k, L.GOAL_DATE)
  const focus = L.getDay(S, L.addDays(k, -1)).night?.focus
  const todayMin = L.trainMin(S, k) + (S.timer.running && S.timer.date === k ? 0 : 0)
  const tm = todayMin + (S.timer.date === k ? Math.floor(((S.timer.acc || 0) + (S.timer.running ? nowMs() - S.timer.startedAt : 0)) / 60000) : 0)

  // next anchor
  const A = L.anchorsFor(k, pd)
  let nxt = A.find((a) => a.at * 60 > sec), nxtMs
  if (nxt) nxtMs = base + nxt.at * 60000
  else { const t = prayerDay(L.addDays(k, 1)); if (t?.Fajr) { nxt = { label: 'Fajr', at: L.toMin(t.Fajr) }; nxtMs = base + 86400000 + nxt.at * 60000 } }

  // prayers
  const names = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha']
  let nextP = null
  if (pd) {
    const i = names.findIndex((n) => L.toMin(pd[n]) * 60 > sec)
    if (i >= 0) nextP = { n: names[i], ms: base + L.toMin(pd[names[i]]) * 60000 }
    else { const t = prayerDay(L.addDays(k, 1)); if (t) nextP = { n: 'Fajr', ms: base + 86400000 + L.toMin(t.Fajr) * 60000 } }
  }

  return `
  ${idx < 0 ? `<div class="banner info"><b>STARTS IN ${-idx} DAY${idx === -1 ? '' : 'S'}</b><span>Plan runs ${L.prettyDate(S.startDate)} to ${L.prettyDate(L.addDays(S.startDate, 29))}.</span></div>` : ''}
  ${banners(c)}
  ${focus ? `<div class="focus"><span>TODAY'S ONE FOCUS</span><b>${esc(focus)}</b></div>` : ''}
  <section class="hero">
    <div class="eyebrow">NOW</div>
    <h1 class="blk">${esc(label)}</h1>
    ${earned ? '' : `<div class="big amber" data-cd="${endMs}">${countdown((endMs - nowMs()) / 1000)}</div>
    <div class="sub">${cur.id === 'night' ? 'until your day starts' : cur.id === 'gap' ? `until ${cur.next ? cur.next.label.toLowerCase() : 'phone out'}` : `left. Until ${L.hm(cur.end)}`}</div>`}
    ${sub ? `<div class="hint">${esc(sub)}</div>` : ''}
  </section>
  ${nxt ? `<section class="card row2"><div><div class="eyebrow">NEXT</div><div class="h2">${esc(nxt.label)} <span class="mut">${L.hm(nxt.at)}</span></div></div><div class="num" data-cd="${nxtMs}">${countdown((nxtMs - nowMs()) / 1000)}</div></section>` : ''}
  <section class="card row2">
    ${ring(tm / L.TRAIN_DAY_MIN, `${(tm / 60).toFixed(1)}h`, 'of 3h')}
    <div class="grow"><div class="eyebrow">TRAINING TODAY</div><div class="h2">${L.fmtMin(tm)}</div><div class="mut">${tm >= L.TRAIN_DAY_MIN ? 'Target hit.' : `${L.fmtMin(L.TRAIN_DAY_MIN - tm)} to go. Timer only.`}</div></div>
  </section>
  <section class="card">
    <div class="row2"><div class="eyebrow">PRAYERS. LONDON</div>${nextP ? `<div class="mut">${nextP.n} in <b class="amber" data-cd="${nextP.ms}">${countdown((nextP.ms - nowMs()) / 1000)}</b></div>` : ''}</div>
    ${pd ? `<div class="prayers">${names.map((n) => `<div class="pt ${nextP?.n === n ? 'on' : ''}"><span>${n}</span><b>${pd[n]}</b></div>`).join('')}</div>` : `<div class="mut pad">No prayer times cached yet. Open the app online once.</div>`}
  </section>
  <section class="card row2"><div><div class="eyebrow">FIRST PAYOUT BY 31 MAR 2027</div><div class="mut">Days left</div></div><div class="num">${Math.max(0, goal)}</div></section>`
}
