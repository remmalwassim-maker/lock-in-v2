import * as L from '../logic.js'
import { S } from '../store.js'
import { esc } from '../ui.js'

export function renderWeek(c, sel) {
  const { k } = c, cur = L.weekOf(S.startDate, k), w = sel ?? cur
  const dates = L.weekDates(S.startDate, w), T = L.WEEKS[w]
  const rows = L.weekRows(S, w), idx = L.dayIndex(S.startDate, k)
  let h = `<div class="row2"><button class="btn sm ghost" data-act="weekNav" data-d="-1" ${w === 0 ? 'disabled' : ''}>Prev</button><div class="center"><div class="eyebrow">WEEK ${w + 1}${w === cur ? ' · THIS WEEK' : ''}</div><div class="mut sm">${L.prettyDate(dates[0])} to ${L.prettyDate(dates.at(-1))}</div></div><button class="btn sm ghost" data-act="weekNav" data-d="1" ${w === 3 ? 'disabled' : ''}>Next</button></div>`
  h += `<div class="targets"><div><span>Lights-out</span><b>${T.lights}</b></div><div><span>TikTok max</span><b>${L.fmtMin(T.tiktok)}</b></div><div><span>Up after Fajr</span><b>${T.up ?? '-'}</b></div></div>`
  h += `<div class="list tight">${rows.map((r) => `<div class="metric ${r.ok === true ? 'good' : r.ok === false ? 'amb' : ''}"><span>${r.label}</span><b>${r.now}</b><em>${r.target}</em></div>`).join('')}</div>`

  // heatmap: Monday-first grid across the 30 days
  const off = (L.dow(S.startDate) + 6) % 7
  const cells = Array(off).fill('<i class="hm blank"></i>')
  for (let i = 0; i < L.PLAN_DAYS; i++) {
    const dk = L.addDays(S.startDate, i), future = dk > k, sc = L.dayScore(S, dk)
    cells.push(`<i class="hm ${future ? 'future' : ''} ${dk === k ? 'today' : ''}" style="--a:${future ? 0 : (0.12 + 0.88 * sc / 100).toFixed(2)}" title="${L.prettyDate(dk)} ${sc}"><u>${parseInt(dk.slice(8))}</u></i>`)
  }
  h += `<div class="eyebrow top">30 DAYS</div><div class="hmhead">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x) => `<span>${x}</span>`).join('')}</div><div class="hmgrid">${cells.join('')}</div><div class="mut sm">Brighter = higher score. Score = non-negotiables plus training vs 3h.</div>`
  h += `<button class="btn amberbg wide" data-act="copySummary" data-w="${w}">Copy summary</button><div class="mut sm center" id="copied"></div>`
  if (idx >= 29) h += review()
  else h += `<button class="btn ghost wide" data-act="toggleReview">Preview 30-day review</button>${S.showReview ? review() : ''}`
  return h
}

function review() {
  const r = L.reviewItems(S)
  return `<section class="card"><div class="eyebrow">30-DAY REVIEW</div><div class="row2"><div><div class="num">${r.kept}<span class="mut">/${r.days}</span></div><div class="mut sm">days kept</div></div><div><div class="num">${r.avgScore}</div><div class="mut sm">average score</div></div></div>
  <div class="eyebrow top">WHAT HELD</div>${r.held.length ? r.held.map((x) => `<div class="metric good"><span>${x.label}</span><b>${x.now}</b><em>${x.target}</em></div>`).join('') : '<div class="mut">Nothing hit target yet.</div>'}
  <div class="eyebrow top">WHAT DIDN'T</div>${r.notHeld.length ? r.notHeld.map((x) => `<div class="metric amb"><span>${x.label}</span><b>${x.now}</b><em>${x.target}</em></div>`).join('') : '<div class="mut">Nothing missed.</div>'}
  <div class="mut sm">Final-week numbers. Copy each week's summary to Claude for the full picture.</div></section>`
}
