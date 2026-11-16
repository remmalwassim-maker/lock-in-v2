import test from 'node:test'
import assert from 'node:assert/strict'
import * as L from '../js/logic.js'

const CHECK = [{ id: 'a', text: 'News' }, { id: 'b', text: 'Bias' }]
const mk = (days = {}) => ({ startDate: '2026-11-17', settings: { checklist: CHECK, notif: {} }, days, sessions: [], reps: [], urges: [] })
const trade = (o = {}) => ({ time: '14:40', dir: 'long', outcome: 'win', followed: true, checklist: true, ...o })
const prepOk = { a: true, b: true }
// 2026-11-17 Tue, 18 Wed, 19 Thu, 20 Fri, 21 Sat, 22 Sun, 23 Mon

test('2026-11-17 is a Tuesday', () => assert.equal(L.dow('2026-11-17'), 2))

test('checklist gate: log locked until every item ticked', () => {
  let s = mk({ '2026-11-18': { prep: { a: true } } })
  assert.equal(L.canLog(s, '2026-11-18').ok, false)
  s = mk({ '2026-11-18': { prep: prepOk } })
  assert.equal(L.canLog(s, '2026-11-18').ok, true)
})

test('max 2 trades: locked after 2', () => {
  const s = mk({ '2026-11-18': { prep: prepOk, trades: [trade(), trade()] } })
  const c = L.canLog(s, '2026-11-18')
  assert.equal(c.ok, false); assert.equal(c.msg, 'Done for today')
})

test('one loss = done for the day', () => {
  const s = mk({ '2026-11-18': { prep: prepOk, trades: [trade({ outcome: 'loss' })] } })
  const c = L.canLog(s, '2026-11-18')
  assert.equal(c.ok, false); assert.equal(c.msg, 'Done. Close the platform.')
})

test('Friday, weekend and red-folder days lock trading', () => {
  const s = mk({ '2026-11-19': { prep: prepOk, redFolder: true } })
  assert.equal(L.tradingState(s, '2026-11-20').msg, 'No trading Friday')
  assert.equal(L.tradingState(s, '2026-11-21').open, false)
  assert.equal(L.tradingState(s, '2026-11-19').code, 'news')
})

test('SIM ONLY: rule break flags next trading day, banner next day, skips weekend', () => {
  let s = mk({ '2026-11-18': { trades: [trade({ followed: false })] } })
  assert.equal(L.simInfo(s, '2026-11-18').sim, false)
  assert.equal(L.simInfo(s, '2026-11-19').sim, true)
  s = mk({ '2026-11-19': { trades: [trade({ followed: false })] } }) // Thu break
  assert.equal(L.simInfo(s, '2026-11-20').sim, false)
  assert.ok(L.simInfo(s, '2026-11-20').banner) // Friday banner warns
  assert.equal(L.simInfo(s, '2026-11-23').sim, true) // Monday is the sim day
  assert.equal(L.simInfo(s, '2026-11-24').sim, false)
})

test('Minimum Day triggers when yesterday had < 3 of 5; "full day" overrides', () => {
  let s = mk({ '2026-11-17': { ticks: { fajr: true, move: true } } })
  assert.equal(L.minModeActive(s, '2026-11-18'), true)
  s.days['2026-11-18'] = { fullDay: true }
  assert.equal(L.minModeActive(s, '2026-11-18'), false)
  s = mk({ '2026-11-17': { ticks: { fajr: true, phone: true, move: true } } })
  assert.equal(L.minModeActive(s, '2026-11-18'), false)
  assert.equal(L.minModeActive(s, '2026-11-17'), false) // day 1 has no yesterday
})

test('Minimum Day kept = Fajr + phone + one line; counts as kept next day', () => {
  const s = mk({ '2026-11-17': {}, '2026-11-18': { minTicks: { fajr: true, phone: true }, minLine: 'ok' } })
  assert.equal(L.minModeActive(s, '2026-11-18'), true)
  assert.equal(L.dayKept(s, '2026-11-18'), true)
  assert.equal(L.minModeActive(s, '2026-11-19'), false)
})

test('3 missed in a row shows the sit-down card', () => {
  const s = mk({ '2026-11-17': {}, '2026-11-18': {}, '2026-11-19': {} })
  // day 4 (20 Nov): previous three days all missed
  assert.equal(L.threeInRow(s, '2026-11-20'), true)
  s.days['2026-11-19'] = { ticks: { fajr: true, phone: true, move: true } }
  assert.equal(L.threeInRow(s, '2026-11-20'), false)
})

test('non-trading days auto-count tick 3', () => {
  const s = mk({ '2026-11-20': { ticks: { fajr: true, phone: true } } })
  assert.equal(L.tickCount(s, '2026-11-20'), 3) // fajr, phone, trading n/a
})

test('week rollover at midnight: weeks are 7-day blocks, week 4 is 9 days', () => {
  assert.equal(L.weekOf('2026-11-17', '2026-11-23'), 0)
  assert.equal(L.weekOf('2026-11-17', '2026-11-24'), 1)
  assert.equal(L.weekOf('2026-11-17', '2026-12-08'), 3)
  assert.equal(L.weekOf('2026-11-17', '2026-12-16'), 3)
  assert.equal(L.weekDates('2026-11-17', 3).length, 9)
  assert.equal(L.weekDates('2026-11-17', 3).at(-1), '2026-12-16')
})

test('timer survives lock: elapsed comes from timestamps, not ticks', () => {
  const t = { running: true, startedAt: 1000, acc: 5000 }
  assert.equal(L.timerElapsed(t, 1000 + 600000), 605000) // 10 min "locked" screen
  assert.equal(L.timerElapsed({ running: false, acc: 5000 }, 9e9), 5000)
})

test('reminders: skipped on non-trading days; night check only if not done', () => {
  let s = mk(); s.settings.notif = { prep: true, sess: true, stop: true, phone: true, night: true, sun: true, fajr10: true }
  assert.ok(!L.remindersFor(s, '2026-11-20', 300).some((r) => r.id === 'prep'))
  assert.ok(L.remindersFor(s, '2026-11-18', 300).some((r) => r.id === 'prep' && r.at === 835))
  assert.ok(L.remindersFor(s, '2026-11-18', 300).some((r) => r.id === 'fajr10' && r.at === 290))
  s.days['2026-11-18'] = { night: { saved: true } }
  assert.ok(!L.remindersFor(s, '2026-11-18', 300).some((r) => r.id === 'night'))
  assert.ok(L.remindersFor(s, '2026-11-22', 300).some((r) => r.id === 'sun'))
})

test('current block and countdown at 14:35', () => {
  const b = L.blocksFor('2026-11-18', 300, 0), c = L.currentBlock(b, 14 * 3600 + 35 * 60)
  assert.equal(c.id, 'session'); assert.equal(c.left, 55 * 60)
})

test('week stats: average lights-out handles past-midnight', () => {
  const s = mk({
    '2026-11-17': { night: { saved: true, lights: '23:30', tiktok: 60 } },
    '2026-11-18': { night: { saved: true, lights: '00:30', tiktok: 120 } },
  })
  const st = L.weekStats(s, 0)
  assert.equal(L.hm(st.lightsAvg), '00:00'); assert.equal(st.tiktokAvg, 90)
})

test('day score: ticks 70% + training 30% on weekdays', () => {
  const s = mk({ '2026-11-18': { ticks: { fajr: true, phone: true, trading: true, move: true }, night: { saved: true } } })
  s.sessions.push({ date: '2026-11-18', min: 90 })
  assert.equal(L.dayScore(s, '2026-11-18'), 70 + 15)
})

test('no scheduled breaks; gap shows work-first until work is done, then earned', () => {
  const b = L.blocksFor('2026-11-18', 300, 0)
  assert.ok(!b.some((x) => /BREAK|FREE|DINNER/.test(x.label)))
  const c = L.currentBlock(b, 13 * 3600) // 13:00, between uni and prep
  assert.equal(c.id, 'gap'); assert.equal(c.next.id, 'prep')
  let s = mk({ '2026-11-18': { ticks: { fajr: true, move: true } } })
  assert.deepEqual(L.workLeft(s, '2026-11-18'), ['trading checklist + journal', '3h 00m training'])
  s = mk({ '2026-11-18': { ticks: { fajr: true, move: true, trading: true } } }); s.sessions.push({ date: '2026-11-18', min: 180 })
  assert.deepEqual(L.workLeft(s, '2026-11-18'), [])
})
