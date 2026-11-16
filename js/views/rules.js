import * as L from '../logic.js'
import { S, } from '../store.js'
import { esc } from '../ui.js'
import { prayerDay } from '../prayer.js'

const TRADING = ['Max 2 trades', 'Checklist or no trade', 'One loss = done', 'No red-folder news days', 'No Fridays', 'Rule break = next day sim only', 'New footprint method on replay until 20 logged trades', 'No new evals until the first payout']
const BAD = [
  'Never miss twice',
  'Minimum day: Fajr (late beats not at all) + one line in the app + phone out of the room = a day kept',
  'No punishment plans. Restart the normal routine next morning',
  'Urge to scroll before the work is done: leave the room for 10 minutes (Urge timer in Train)',
  'Rule broken: sim only tomorrow',
  '3 days off track: sit down with yourself, then check in with Claude',
  'Heavy for 2+ weeks: talk to someone you trust',
]

export function renderRules(c) {
  const { k, pd, w } = c, f = pd?.Fajr
  const R = [
    [f ? `~${f}` : '~Fajr', 'Fajr, on time', w < 2 ? 'Back to sleep allowed in weeks 1 and 2' : 'Stay up'],
    ['08:00', 'Up. No phone for 30 min'], ['09:00 to 13:00', 'Uni'], ['14:00 to 14:30', 'Prep'],
    ['14:30 to 15:30', 'Trade', 'Hard stop, or 2 trades'], ['15:30 to 16:00', 'Journal'], ['16:15 to 17:30', 'Gym (back-safe) or walk'],
    ['18:00 to 20:00', 'Focus block', 'One thing only'], ['22:30', 'Phone outside the room'],
  ]
  const goal = L.diffDays(k, L.GOAL_DATE)
  return `<div class="row2"><h1 class="blk">RULES</h1><button class="btn sm ghost" data-act="openSettings">Settings</button></div>
  <section class="card row2"><div><div class="eyebrow">THE GOAL</div><b>First payout by 31 Mar 2027</b></div><div class="num">${Math.max(0, goal)}<span class="mut sm"> days</span></div></section>
  <div class="eyebrow top">DAILY ROUTINE (UNI DAY)</div><div class="mut sm">Work only. Breaks and free time aren't scheduled: you earn them by finishing the work.</div>
  <div class="list tight">${R.map(([t, a, b]) => `<div class="rt"><b>${t}</b><div><span>${a}</span>${b ? `<small>${b}</small>` : ''}</div></div>`).join('')}</div>
  ${pd ? `<div class="mut sm">Prayer times today: ${['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map((n) => `${n} ${pd[n]}`).join(' · ')}</div>` : ''}
  <div class="eyebrow top">TRADING RULES</div><div class="list tight">${TRADING.map((t, i) => `<div class="rule-i"><b>${i + 1}</b><span>${t}</span></div>`).join('')}</div>
  <div class="eyebrow top">BAD-DAY RULES</div><div class="list tight">${BAD.map((t, i) => `<div class="rule-i"><b>${i + 1}</b><span>${t}</span></div>`).join('')}</div>`
}
