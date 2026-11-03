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

The app runs at http://localhost:3000. Pass-and-play works without Supabase; online rooms need a Supabase project with the game's tables and functions set up. The database schema is not included in this repository.

Never commit `.env.local`. Only the public anon key belongs in this app.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Dev server with hot reload |
| `npm test` | Test runner (watch mode) |
| `npm run build` | Production build into `build/` |

## Progressive Web App

Acrosticism Online is built as a PWA so players can add it to their home screen and play like an app.

**Offline play is not supported yet.** The app needs a connection to load and to play online rooms. The word and theme lists are cached after the first load, which is a first step toward offline pass-and-play.

## Deployment

Deployed on Vercel. Set `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY` in the Vercel project's environment variables.

## Project structure

```
public/   static assets and web app manifest
src/      application source (screens, room logic, Supabase client)
```

## License

Copyright © 2026 Acrosticism Studio. All rights reserved.

This repository is public so people can see how Acrosticism Online is built,
but the code, game content, name, and artwork are not licensed for copying,
modification, redistribution, or commercial use without written permission.

Outside pull requests are not accepted.