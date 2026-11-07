# Acrosticism Online

The web version of **Acrosticism**, a word and backronym game. If you can read, you can play.

**Play now:** https://play.acrosticism.com

| | |
|---|---|
| Home | https://www.acrosticism.com |
| Play (this app) | https://play.acrosticism.com |
| Shop the physical game | https://shop.acrosticism.com |

## What is Acrosticism?

Each player gets a word and writes a backronym for it: one line per letter, with each line starting with that letter. A theme sets the topic, and a judge picks the best one. Two minutes on the clock, no age limit.

## Ways to play

**Daily challenge: Acrosticize THIS!** (solo, one per day)
- Everyone gets the same word each day and the same theme each week, so results are easy to compare.
- Two minutes on the clock. Progress is saved on the device, so refreshing does not reset the timer.
- One attempt per day. Lines go through the word filter before they can be shared.
- A finished backronym can be shared as an image card, or copied as text, with a link back to the game.
- A day streak counts consecutive days played. It is kept on the device.

**Pass and play** (one device, 2 to 6 players)
- Enter player names and choose a random theme or write your own.
- Players take turns on the same device, with a 2-minute timer each.
- Everyone's backronyms are revealed together at the end of the round.

**Online rooms** (each player on their own device)
- The host creates a room and shares the room code or a link (`?room=CODE`).
- Join as a **player** or as a **spectator**.
- Each turn, one player is the judge:
  1. **Theme:** the judge chooses a theme.
  2. **Writing:** everyone else writes against the clock.
  3. **Judging:** the judge picks a winner, declares a tie, or calls a lie.
  4. **Reveal:** results are shown, then the judge role moves on.
- Host options include anonymous submissions and a word filter.
- Hosts can remove players or skip the current judge.
- Refresh the page and the app rejoins you to your game.
- After the final match, players see a results screen with a link to buy the physical game.

## Tech stack

- React 19 + TypeScript, bootstrapped with Create React App
- [Supabase](https://supabase.com) for online rooms, with realtime subscriptions
- Word and theme lists published from Google Sheets as CSV and cached in `localStorage`
- The daily challenge reads its own word and theme lists from a separate published Google Sheet
- Hosted on Vercel

## Getting started

**Prerequisites:** Node.js (LTS) and npm.

```bash
git clone https://github.com/acrosticism-the-game/AcrOnline.Acrosticism.com.git
cd AcrOnline.Acrosticism.com
npm install
```

Create a `.env.local` file in the project root:

```bash
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then start the dev server:

```bash
npm start
```

The app runs at http://localhost:3000. Pass-and-play and the daily challenge work without Supabase; online rooms need a Supabase project with the game's tables and functions set up. The database schema is not included in this repository.

Never commit `.env.local`. Only the public anon key belongs in this app.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server with hot reload |
| `npm test` | Test runner (watch mode) |
| `npm run build` | Production build into `build/` |

## Daily challenge

### How the word and theme are chosen
- Both are picked from the date, so no database is needed. A day is judged in Eastern time, so everyone sees the same challenge.
- Day No. 1 is `DAILY_LAUNCH_DATE` in `src/dailyUtils.ts`. Use a Monday, since the weekly theme changes on Mondays.
- Each word is used once before any word repeats. The order is shuffled the same way for everyone.
- Add new words and themes at the bottom of each tab. Reordering rows, deleting rows, or changing the length of a list changes which entry comes up on future days.

### The lists
- A separate Google Sheet with two tabs: Word Deck (header `Words`) and Theme Deck (header `Front Text`), one entry per row.
- Each tab is published to the web as CSV. The two links are `DAILY_WORDS_CSV` and `DAILY_THEMES_CSV` in `src/dailyLists.ts`. The Theme Deck link uses that tab's `gid`.
- The page asks the sheet for fresh lists each time it opens. A saved copy in `localStorage` is only used if the network fails. Sheet edits can take a few minutes to appear.

### The share image
- `src/shareCard.ts` draws the card in the player's browser. It uses the background `public/share-background.png` (1080 by 1350), the Fredoka font loaded from Google Fonts, and a white panel for the backronym.
- Settings near the top of that file control the text box position (`TEXT_AREA`), panel opacity and outline, font, and colors.
- On phones the button opens the share sheet with the image. On desktop it downloads the image. Players can also copy a plain text version.
- The hashtags and link are in `src/dailyUtils.ts` (`DAILY_HASHTAGS` and `DAILY_SHARE_URL`).

### Saved on the player's device (`localStorage`)
- `acr_daily_YYYY-MM-DD`: that day's word, theme, start time, lines, and whether it was submitted. This keeps the clock honest across refreshes.
- `acr_daily_streak`: the current and best day streak.
- `acr_daily_list_words` and `acr_daily_list_themes`: fallback copies of the lists.

To replay a day while testing, delete that day's key in the browser DevTools, under Application, then Local Storage.

## Progressive Web App

Acrosticism Online is built as a PWA so players can add it to their home screen and play like an app.

**Offline play is not supported yet.** The app needs a connection to load and to play online rooms. The word and theme lists are cached after the first load, which is a first step toward offline pass-and-play.

## Deployment

Deployed on Vercel. Set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in the Vercel project's environment variables.

## Project structure

```
public/   static assets, web app manifest, and share-background.png
src/      application source (screens, room logic, Supabase client)
          DailyChallenge.tsx   the daily challenge screen
          dailyUtils.ts        date, word and theme picking, share text
          dailyLists.ts        loads the daily word and theme lists
          dailyStreak.ts       day streak, saved on the device
          shareCard.ts         draws the share image
```

## License

Copyright © 2026 Acrosticism Studio. All rights reserved.

This repository is public so people can see how Acrosticism Online is built,
but the code, game content, name, and artwork are not licensed for copying,
modification, redistribution, or commercial use without written permission.

Outside pull requests are not accepted.