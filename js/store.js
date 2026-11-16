// All app data lives in localStorage under one key. Everything is saved on every change.
import { DEFAULT_START } from './logic.js'

const KEY = 'lockin2'
export const DEFAULT_CHECKLIST = [
  { id: 'c1', text: 'News checked (red folder = no trade)' },
  { id: 'c2', text: 'Bias set' },
  { id: 'c3', text: 'A+ zones marked' },
  { id: 'c4', text: 'Scenarios written' },
]
export const DEFAULT_NOTIF = { fajr10: true, prep: true, sess: true, stop: true, phone: true, night: true, sun: true }

const fresh = () => ({
  v: 2, startDate: DEFAULT_START,
  settings: { checklist: structuredClone(DEFAULT_CHECKLIST), notif: { ...DEFAULT_NOTIF } },
  days: {}, sessions: [], reps: [], urges: [],
  timer: { running: false, startedAt: 0, acc: 0, cat: 'Replay reps', date: '' },
  urgeActive: null, dismissed3: {}, fired: {},
})

function merge(raw) {
  const f = fresh(), s = { ...f, ...raw }
  s.settings = { ...f.settings, ...(raw.settings || {}) }
  s.settings.notif = { ...f.settings.notif, ...(raw.settings?.notif || {}) }
  if (!Array.isArray(s.settings.checklist) || !s.settings.checklist.length) s.settings.checklist = f.settings.checklist
  s.timer = { ...f.timer, ...(raw.timer || {}) }
  for (const a of ['sessions', 'reps', 'urges']) if (!Array.isArray(s[a])) s[a] = []
  for (const o of ['days', 'dismissed3', 'fired']) if (!s[o] || typeof s[o] !== 'object') s[o] = {}
  return s
}

function load() {
  try { const r = localStorage.getItem(KEY); if (r) return merge(JSON.parse(r)) } catch {}
  return fresh()
}

export let S = load()
export const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)) } catch {} }
export const uid = () => Math.random().toString(36).slice(2, 9)

// mutable day record (created on first write)
export function dayRec(k) {
  if (!S.days[k]) S.days[k] = {}
  const d = S.days[k]
  d.ticks ||= {}; d.notes ||= {}; d.prayers ||= {}; d.minTicks ||= {}; d.prep ||= {}; d.trades ||= []
  return d
}

export const exportJSON = () => JSON.stringify(S, null, 2)
export function importJSON(text) {
  const raw = JSON.parse(text)
  if (!raw || typeof raw !== 'object' || !raw.days || !raw.startDate) throw new Error('Not a LOCK IN backup')
  S = merge(raw); save()
}
export function resetAll() { S = fresh(); save() }
