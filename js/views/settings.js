import { S } from '../store.js'
import { esc } from '../ui.js'

const NOTIF = [['fajr10', '10 min before Fajr'], ['prep', '13:55 Prep in 5'], ['sess', '14:25 Session in 5'], ['stop', '15:30 Hard stop. Journal.'], ['phone', '22:20 Phone out in 10'], ['night', '22:35 Night check (if not done)'], ['sun', 'Sunday 18:00 Weekly review']]

export function renderSettings() {
  const perm = 'Notification' in window ? Notification.permission : 'unsupported'
  return `<div class="row2"><h1 class="blk">SETTINGS</h1><button class="btn sm ghost" data-act="closeSettings">Back</button></div>
  <section class="card"><div class="eyebrow">START DATE</div><form data-form="startDate" class="inl"><input type="date" name="d" value="${S.startDate}" required><button class="btn sm">Save</button></form><div class="mut sm">Day 1 of 30. Weeks are 7-day blocks from here. Week 4 is 9 days.</div></section>
  <section class="card"><div class="eyebrow">TRADING CHECKLIST</div>
    ${S.settings.checklist.map((i) => `<form class="inl" data-form="checkItem" data-id="${i.id}"><input name="t" value="${esc(i.text)}" autocomplete="off"><button class="btn sm">Save</button><button type="button" class="btn sm ghost" data-act="delCheck" data-id="${i.id}">Remove</button></form>`).join('')}
    <form class="inl" data-form="addCheck"><input name="t" placeholder="New checklist item" autocomplete="off"><button class="btn sm">Add</button></form>
    <div class="mut sm">Editing the list changes which items must be ticked to unlock Log trade.</div></section>
  <section class="card"><div class="eyebrow">NOTIFICATIONS</div>
    ${NOTIF.map(([id, lab]) => `<button class="toggle ${S.settings.notif[id] ? 'on' : ''}" data-act="notif" data-id="${id}"><span>${lab}</span><b>${S.settings.notif[id] ? 'On' : 'Off'}</b></button>`).join('')}
    ${S.pushOn && perm === 'granted'
      ? `<div class="banner ok"><b>PUSH ON</b><span>Reminders arrive even when the app is closed.</span></div><button class="btn ghost wide" data-act="pushOff">Turn off notifications</button>`
      : `<button class="btn amberbg wide" data-act="pushOn">Turn on notifications</button><div class="mut sm">${perm === 'denied' ? 'Blocked in iOS Settings. Enable under Settings, Notifications, LOCK IN.' : 'On iPhone, open the app from its Home Screen icon first. Permission: ' + perm + '.'}</div>`}
  </section>
  <section class="card"><div class="eyebrow">DATA</div>
    <button class="btn wide" data-act="exportFile">Export JSON file</button>
    <button class="btn ghost wide" data-act="exportCopy">Copy JSON to clipboard</button>
    <label class="btn ghost wide filebtn">Import JSON file<input type="file" accept="application/json,.json" data-file="import" hidden></label>
    <form data-form="importText"><textarea name="t" rows="3" placeholder="Or paste a backup here"></textarea><button class="btn ghost wide">Import pasted JSON</button></form>
    <div class="mut sm" id="dataMsg"></div>
  </section>
  <section class="card"><div class="eyebrow">DANGER</div><button class="btn danger wide" data-act="resetAsk">Reset all data</button></section>`
}
