import * as L from '../logic.js'
import { S } from '../store.js'
import { esc, clock, countdown } from '../ui.js'
import { dayStartMs, nowMs } from '../clock.js'
import { banners } from './now.js'

export const CATS = ['Replay reps', 'Review', 'Study']

export function renderTrain(c) {
  const { k, sec, w } = c, d = L.getDay(S, k), t = S.timer
  const el = L.timerElapsed(t, nowMs())
  const done = L.trainMin(S, k)
  const live = t.date === k ? Math.floor(el / 60000) : 0
  const dayMin = done + live
  const wk = L.weekDates(S.startDate, w), weekdays = wk.filter((x) => L.dow(x) >= 1 && L.dow(x) <= 5).length
  const wkMin = wk.reduce((a, x) => a + L.trainMin(S, x), 0) + live
  const wkTarget = 180 * weekdays
  const pct = (a, b) => Math.min(100, Math.round((a / b) * 100))
  const ts = L.tradingState(S, k), can = L.canLog(S, k), sim = L.simInfo(S, k)
  const cl = S.settings.checklist, ticked = cl.filter((i) => d.prep[i.id]).length

  // ---- timer
  let h = banners(c) + `<section class="card timer">
    <div class="eyebrow">TRAINING TIMER</div>
    <div class="big ${t.running ? 'amber' : ''}" data-elapsed>${clock(el / 1000)}</div>
    <div class="chips">${CATS.map((x) => `<button class="chip ${t.cat === x ? 'sel' : ''}" data-act="cat" data-v="${x}" ${t.running ? 'disabled' : ''}>${x}</button>`).join('')}</div>
    <div class="btns">
      ${t.running ? `<button class="btn big-btn" data-act="timerPause">Pause</button>` : `<button class="btn big-btn amberbg" data-act="timerStart">${t.acc ? 'Resume' : 'Start'}</button>`}
      <button class="btn big-btn ghost" data-act="timerStop" ${!t.running && !t.acc ? 'disabled' : ''}>Stop and save</button>
    </div>
    <p class="rule">Phone away. Timer running. Otherwise it doesn't count.</p>
    <div class="bar"><i style="width:${pct(dayMin, 180)}%"></i></div><div class="row2 mut sm"><span>Today ${L.fmtMin(dayMin)} / 3h</span><span>${pct(dayMin, 180)}%</span></div>
    <div class="bar"><i style="width:${pct(wkMin, wkTarget)}%"></i></div><div class="row2 mut sm"><span>Week ${(wkMin / 60).toFixed(1)}h / ${wkTarget / 60}h</span><span>${pct(wkMin, wkTarget)}%</span></div>
    <div class="list tight">${S.sessions.filter((s) => s.date === k).map((s) => `<div class="li" data-act="editSession" data-id="${s.id}"><b>${L.fmtMin(s.min)}</b><span>${esc(s.cat)}${s.reason ? ' · ' + esc(s.reason) : ''}</span><em>Edit</em></div>`).join('')}</div>
    <button class="btn ghost wide" data-act="addSession">Add or fix a past session</button>
  </section>`

  // ---- replay reps
  const n = S.reps.length
  h += `<section class="card"><div class="row2"><div><div class="eyebrow">REPLAY REPS</div><div class="num">${n}<span class="mut"> / ${L.REPS_TARGET}</span></div></div><button class="btn amberbg" data-act="addRep">+1 rep</button></div>
    <div class="bar"><i style="width:${pct(n, L.REPS_TARGET)}%"></i></div>
    <div class="mut sm">Target ${L.REPS_TARGET} by 16 Dec. New footprint method stays on replay until 20 logged trades.</div>
    ${S.reps.slice(-3).reverse().map((r) => `<div class="li"><b>${esc(r.outcome)}</b><span>${r.absorption ? 'Absorption' : 'No absorption'} · ${r.trapped ? 'Trapped' : 'No trapped'} · ${esc(r.dayType)}</span></div>`).join('')}</section>`

  // ---- live session
  const blk = sec < 840 * 60 ? 'Before prep' : sec < 870 * 60 ? 'PREP 14:00 to 14:30' : sec < 930 * 60 ? 'SESSION 14:30 to 15:30' : sec < 960 * 60 ? 'JOURNAL 15:30 to 16:00' : 'Session over'
  const stopMs = dayStartMs(k) + 930 * 60000
  h += `<section class="card"><div class="row2"><div class="eyebrow">LIVE SESSION</div><div class="mut sm">${blk}</div></div>`
  if (sim.sim) h += `<div class="banner bad"><b>SIM ONLY</b><span>Sim account today. Mark each trade as sim.</span></div>`
  if (L.isTradingDay(k)) h += `<button class="toggle ${d.redFolder ? 'on' : ''}" data-act="redFolder"><span>Red-folder news day (NFP, CPI, FOMC)</span><b>${d.redFolder ? 'ON. No trading' : 'Off'}</b></button>`
  if (!ts.open) h += `<div class="stop"><b>${esc(ts.msg)}</b></div>`
  else if (sec >= 870 * 60 && sec < 930 * 60) h += `<div class="row2 pad"><span class="mut">Hard stop 15:30</span><span class="num amber" data-cd="${stopMs}">${countdown((stopMs - nowMs()) / 1000)}</span></div>`
  if (L.tradingNeeded(S, k)) {
    h += `<div class="eyebrow top">PRE-MARKET CHECKLIST ${ticked}/${cl.length}</div><div class="list tight">${cl.map((i) => `<div class="nn sm ${d.prep[i.id] ? 'done' : ''}" data-act="prep" data-id="${i.id}"><span class="box">${d.prep[i.id] ? 'OK' : ''}</span><div class="grow"><b>${esc(i.text)}</b></div></div>`).join('')}</div>`
    h += `<button class="btn big-btn wide ${can.ok ? 'amberbg' : 'locked'}" data-act="logTrade" ${can.ok ? '' : 'disabled'}>${can.ok ? 'Log trade' : 'Locked. ' + esc(can.msg)}</button>`
    h += `<div class="mut sm">Trades today ${d.trades.length}/${L.MAX_TRADES}. 15:30 to 16:00: journal every trade.</div>`
  }
  h += d.trades.map((x) => `<div class="li"><b class="${x.outcome === 'loss' ? 'red' : x.outcome === 'win' ? 'green' : ''}">${x.outcome.toUpperCase()}</b><span>${x.time} ${x.dir}${x.usd !== '' && x.usd != null ? ` · $${esc(x.usd)}` : ''}${x.r !== '' && x.r != null ? ` · ${esc(x.r)}R` : ''}${x.followed === false ? ' · RULE BROKEN' : ''}${x.sim ? ' · sim' : ''}${x.note ? ' · ' + esc(x.note) : ''}</span></div>`).join('')
  h += `</section>`

  // ---- urge timer
  const u = S.urgeActive
  if (u) {
    const end = u.start + L.URGE_MS, left = (end - nowMs()) / 1000
    h += `<section class="card urge on"><div class="eyebrow">URGE TIMER</div><div class="big amber" data-cd="${end}" data-urge>${countdown(left)}</div><h2>Leave the room.</h2><p>Come back when it ends.</p><button class="btn ghost wide" data-act="urgeGaveIn">I scrolled</button></section>`
  } else {
    const b = S.urges.filter((x) => x.beaten).length
    h += `<section class="card urge"><button class="btn big-btn wide" data-act="urgeStart">I want to scroll</button><div class="mut sm center">Starts a 10 minute timer. Urges beaten: ${b} of ${S.urges.length}.</div></section>`
  }
  return h
}
