# LOCK IN v2

Personal discipline PWA for the 30-Day Reset Plan (17 Nov to 16 Dec 2026). Plain HTML/CSS/JS, no build step, fully offline, data in `localStorage`.

## Run locally
```
py -m http.server 5180      # then open http://localhost:5180
node --test tests/          # rule tests
node scripts/make-ics.mjs   # regenerate reminders.ics (needs internet)
```

## Layout
- `js/logic.js` all rules and maths (pure, unit-tested in `tests/rules.test.mjs`)
- `js/store.js` localStorage state, export/import. `js/prayer.js` Aladhan (London, Moonsighting Committee), cached 30 days
- `js/views/*` the five tabs plus Settings. `js/app.js` router, actions, timers, reminders
- `sw.js` network-first service worker (updates always arrive, offline falls back to cache)

## Testing with a fake clock
In the browser console: `__setNow('2026-11-18T14:35:00')` (reloads, survives reload for the tab). `__setNow()` resets.

## Assumptions to know about
- 17 Nov 2026 is a **Tuesday**, so plan weeks run Tue to Mon. "Sunday review" falls mid-week; the Sunday 18:00 reminder still fires on Sundays.
- Week 4 is 9 days (8 to 16 Dec). Its prayer, training and movement targets scale with the days (21h training, 32 prayers).
- Non-trading days (Fri, weekends, red-folder news) count non-negotiable 3 as done automatically.
- A Minimum Day kept counts as 3 of 5. Yesterday under 3 of 5 (and no Minimum Day kept) triggers Minimum Day today.
- SIM ONLY: a trade logged as "did not follow every rule" flags the next trading day (the banner starts the day after, so a Thursday break shows a heads-up Friday and applies Monday).
- Trades can't be deleted, so the locks can't be undone by editing history.
- Night check done before 04:00 counts for the previous day if that day's isn't saved yet.

## iOS limits
iOS cannot schedule local notifications for a PWA that is closed, and has no background timers. While the app is open, reminders show as in-app banners (and as system notifications if permission is granted). For alerts with the app closed, import `reminders.ics` into Calendar.
