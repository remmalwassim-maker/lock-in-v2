import * as L from '../logic.js'
import { S } from '../store.js'
import { esc } from '../ui.js'
import { banners } from './now.js'

const NAMES = { fajr: 'Fajr on time + one dua', phone: '', trading: 'Trading checklist before, journal after', move: 'Move 20 minutes (a walk counts)', night: 'Night check done' }
const PNAME = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' }

// the day the night check belongs to: before 04:00 it still counts for yesterday (if that one isn't done)
export const nightKey = (c) => (c.sec < 4 * 3600 && !L.tickValue(S, L.addDays(c.k, -1), 'night') && L.inPlan(S.startDate, L.addDays(c.k, -1)) ? L.addDays(c.k, -1) : c.k)

function nnRow(c, id, i) {
  const { k, w } = c, d = L.getDay(S, k)
  const done = L.tickValue(S, k, id), note = d.notes[id]
  let title = NAMES[id], sub = ''
  if (id === 'phone') { title = `Phone charges outside my room`; sub = `By ${L.WEEKS[w].phoneBy}` }
  if (id === 'trading') {
    const t = L.tradingState(S, k)
    if (!L.tradingNeeded(S, k)) { title = L.dow(k) === 5 ? 'No trading. Review day' : 'No trading today'; sub = 'Counts as done' }
    else sub = 'Tick when the checklist was done and the journal is written'
  }
  if (id === 'night') {
    const nk = nightKey(c)
    return `<div class="nn ${L.tickValue(S, nk, 'night') ? 'done' : ''}" data-act="night"><span class="box">${i}</span><div class="grow"><b>${title}</b><small>${L.tickValue(S, nk, 'night') ? 'Saved. Tap to edit' : 'Tap to open the night check'}</small></div></div>`
  }
  const auto = id === 'trading' && !L.tradingNeeded(S, k)
  return `<div class="nn ${done ? 'done' : ''}" ${auto ? '' : `data-act="tick" data-id="${id}" data-long="${id}"`}><span class="box">${done ? 'OK' : i}</span><div class="grow"><b>${title}</b>${sub || note ? `<small>${esc(note || sub)}</small>` : ''}</div></div>`
}

export function renderToday(c) {
  const { k, w } = c, d = L.getDay(S, k), idx = L.dayIndex(S.startDate, k)
  const min = L.minModeActive(S, k)
  let h = banners(c)
  h += `<div class="eyebrow">${L.prettyDate(k).toUpperCase()}${idx >= 0 && idx < 30 ? ` · DAY ${idx + 1} OF 30` : ''}</div>`

  if (min) {
    h += `<h1 class="blk">MINIMUM DAY</h1><p class="mut">Three things keep the day. Late beats not at all.</p>
    <div class="list">
      <div class="nn ${d.minTicks.fajr ? 'done' : ''}" data-act="minTick" data-id="fajr"><span class="box">${d.minTicks.fajr ? 'OK' : 1}</span><div class="grow"><b>Fajr</b><small>Late beats not at all</small></div></div>
      <form class="nn line ${String(d.minLine || '').trim() ? 'done' : ''}" data-form="minLine"><span class="box">${String(d.minLine || '').trim() ? 'OK' : 2}</span><div class="grow"><b>One line in the app</b><input name="line" value="${esc(d.minLine || '')}" placeholder="One honest line about today" autocomplete="off"><button class="btn sm">Save</button></div></form>
      <div class="nn ${d.minTicks.phone ? 'done' : ''}" data-act="minTick" data-id="phone"><span class="box">${d.minTicks.phone ? 'OK' : 3}</span><div class="grow"><b>Phone out of the room</b><small>By ${L.WEEKS[w].phoneBy}</small></div></div>
    </div>
    ${L.minDone(d) ? `<div class="banner ok"><b>DAY KEPT</b><span>Minimum done. Normal routine tomorrow.</span></div>` : ''}
    <button class="btn ghost wide" data-act="fullDay">I'm good, full day</button>`
  } else {
    h += `<h1 class="blk">${L.effTicks(S, k)}<span class="mut">/5</span> DONE</h1><p class="mut">Tap to tick. Hold to add a note.</p><div class="list">${L.NN.map((id, i) => nnRow(c, id, i + 1)).join('')}</div>`
  }

  h += `<div class="eyebrow top">PRAYERS</div><div class="list">${L.PRAYERS.map((p) => {
    const v = d.prayers[p]
    return `<div class="pray"><b>${PNAME[p]}</b><div class="seg">${[['on', 'On time'], ['late', 'Late'], ['missed', 'Missed']].map(([val, lab]) => `<button class="${v === val ? 'sel ' + val : ''}" data-act="prayer" data-p="${p}" data-v="${val}">${lab}</button>`).join('')}</div></div>`
  }).join('')}</div>`
  if (L.WEEKS[w].up != null) h += `<div class="nn ${d.upAfterFajr ? 'done' : ''}" data-act="upFajr"><span class="box">${d.upAfterFajr ? 'OK' : '+'}</span><div class="grow"><b>Stayed up after Fajr</b><small>Target ${L.WEEKS[w].up}+ days this week</small></div></div>`
  return h
}
