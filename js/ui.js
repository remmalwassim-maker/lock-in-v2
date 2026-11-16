// Small UI helpers: escaping, clock formatting, ring, bottom sheet.
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const pad = (n) => String(n).padStart(2, '0')
export const clock = (sec) => { sec = Math.max(0, Math.floor(sec)); return `${Math.floor(sec / 3600)}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}` }
export const countdown = (sec) => { sec = Math.max(0, Math.floor(sec)); const h = Math.floor(sec / 3600); return h ? `${h}:${pad(Math.floor((sec % 3600) / 60))}:${pad(sec % 60)}` : `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}` }

export function ring(frac, big, small) {
  const r = 52, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac))
  return `<div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${r}" class="ring-bg"/><circle cx="60" cy="60" r="${r}" class="ring-fg" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 60 60)"/></svg><div class="ring-t"><b>${big}</b><span>${small}</span></div></div>`
}

export function openSheet(title, body) {
  const s = document.getElementById('sheet')
  s.innerHTML = `<div class="sheet-bg" data-act="closeSheet"></div><div class="sheet-card" role="dialog" aria-label="${esc(title)}"><div class="sheet-h"><h2>${esc(title)}</h2><button class="x" data-act="closeSheet" aria-label="Close">Close</button></div>${body}</div>`
  s.hidden = false
  document.body.classList.add('noscroll')
}
export function closeSheet() {
  const s = document.getElementById('sheet')
  s.hidden = true; s.innerHTML = ''
  document.body.classList.remove('noscroll')
}
export const sheetOpen = () => !document.getElementById('sheet').hidden
