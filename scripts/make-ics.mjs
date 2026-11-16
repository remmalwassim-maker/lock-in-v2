// Builds reminders.ics: one calendar event per reminder with an alert at event time.
// iOS PWAs can't schedule notifications while closed, but Calendar alerts always fire.
// Usage: node scripts/make-ics.mjs [startDate=2026-11-17]
import fs from 'node:fs'
import { addDays, dow, PLAN_DAYS } from '../js/logic.js'

const start = process.argv[2] || '2026-11-17'
const pad = (n) => String(n).padStart(2, '0')
const stamp = (k, m) => `${k.replaceAll('-', '')}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`
const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LOCK IN v2//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:LOCK IN reminders']
const ev = (k, m, title) => out.push('BEGIN:VEVENT', `UID:lockin-${k}-${m}@lockin`, `DTSTAMP:20260101T000000Z`, `DTSTART:${stamp(k, m)}`, `DTEND:${stamp(k, m + 5)}`, `SUMMARY:${title}`, 'BEGIN:VALARM', 'TRIGGER:PT0S', 'ACTION:DISPLAY', `DESCRIPTION:${title}`, 'END:VALARM', 'END:VEVENT')

const fajr = {}
for (const ym of new Set(Array.from({ length: PLAN_DAYS }, (_, i) => addDays(start, i).slice(0, 7)))) {
  const [y, m] = ym.split('-')
  const j = await (await fetch(`https://api.aladhan.com/v1/calendarByCity/${y}/${Number(m)}?city=London&country=United%20Kingdom&method=15`)).json()
  for (const e of j.data) { const [dd, mm, yy] = e.date.gregorian.date.split('-'); fajr[`${yy}-${mm}-${dd}`] = e.timings.Fajr.slice(0, 5) }
}
for (let i = 0; i < PLAN_DAYS; i++) {
  const k = addDays(start, i), d = dow(k), trade = d >= 1 && d <= 4
  if (fajr[k]) { const [h, mi] = fajr[k].split(':').map(Number); ev(k, h * 60 + mi - 10, 'Fajr in 10 minutes') }
  if (trade) { ev(k, 835, 'Prep in 5'); ev(k, 865, 'Session in 5. Checklist first.'); ev(k, 930, 'Hard stop. Journal.') }
  ev(k, 1340, 'Phone out in 10'); ev(k, 1355, 'Night check')
  if (d === 0) ev(k, 1080, 'Weekly review. Copy summary to Claude.')
}
out.push('END:VCALENDAR')
fs.writeFileSync(new URL('../reminders.ics', import.meta.url), out.join('\r\n') + '\r\n')
console.log('reminders.ics written,', out.filter((l) => l === 'BEGIN:VEVENT').length, 'events')
