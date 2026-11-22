# Practical To-Do

A personal to-do app for keeping track of ideas and projects, putting items aside until later, and seeing what keeps getting postponed.

Built step by step in the Practical AI coding demo. What the first pass must do is in [story.md](story.md).

## Current stage

**First pass.** The app runs on one Linux machine. Your items live outside the repo, in your home folder. A demo with made-up items runs separately, so you can try or test the app without touching your own list.

## Install

You need Linux with systemd, [Node.js](https://nodejs.org/) 20 or newer, and a Chromium-based browser (Chromium, Chrome, Brave or Edge). There are no packages to install.

```sh
git clone https://github.com/LightCC/practical-todo.git
cd practical-todo
npm run app:install
```

This adds **Practical Todo** to your app launcher. It also adds a background service for the small local server that saves your items. Nothing needs root.

## Open it

Open **Practical Todo** from your app launcher. On Omarchy, press Super + Space and type "todo".

The app opens in its own window. If the server isn't running, the launcher starts it first. The server keeps running after you close the window, so the app opens instantly next time.

To try the app with made-up items instead of your own, run `bin/practical-todo --demo`.

## Your items

Your items are kept in one file outside the repo:

| | Folder | Used by |
|---|---|---|
| **Your items** | `~/.local/share/practical-todo/items.json` | The installed app, `npm start` |
| **Demo items** | `~/.local/share/practical-todo-demo/items.json` | `bin/practical-todo --demo`, `npm run demo` |

These follow the Linux convention for app data (`$XDG_DATA_HOME`). The app starts with an empty list. Only the demo gets made-up items. Back up the first folder to keep your items safe.

**Bring in items from a seed file:**
```sh
npm run import -- /path/to/seed-tasks.json            # into an empty list
npm run import -- /path/to/seed-tasks.json --replace  # overwrite; keeps a .bak copy
systemctl --user restart practical-todo
```
The import maps the seed's `focus` and `status` onto Practical Todo's places and stops, without importing, if a field or value isn't recognised.

**Keeping real data out of git:** none of your items, titles or project names belong in the repo, its tests, docs or commit messages. Before every commit, run:
```sh
npm run check:data
```
It reads your real items and searches every file git would commit. It reports file names only, never the matched text.

## Manage it

| To | Run |
|---|---|
| Update after pulling new code | `npm run app:install` (this also restarts the server) |
| Stop the server | `systemctl --user stop practical-todo` |
| See server logs | `journalctl --user -u practical-todo` |
| Start the server at every login | `systemctl --user enable practical-todo` |
| Stop the demo server | `fuser -k 4318/tcp` |
| Start the demo over | stop the demo server, then delete `~/.local/share/practical-todo-demo` |
| Remove the app | `npm run app:uninstall` (your items are kept) |

## Develop and test

- `npm run demo` runs the demo server in the terminal on http://localhost:4318. `npm start` does the same with your real items on http://localhost:4317.
- `npm test` checks the rules: snooze times, places, snooze counts, sorting and the seed import. The tests use made-up data only.
- [docs/manual-test.md](docs/manual-test.md) is a step-by-step manual test of every acceptance criterion, run against the demo.
- `PRACTICAL_TODO_DATA=/some/folder` and `PORT=5000` override the data folder and port.

## Code layout

| Path | What it holds |
|---|---|
| `public/core.js` | The rules: places, snooze times, state changes, sorting, IDs |
| `public/app.js` | The screen: card list, filter, table, snooze menu, editor |
| `server.js` | Hosts the app and saves items |
| `paths.js` | Where the real and demo data live |
| `bin/practical-todo` | Launcher: starts the server if needed, opens the app window |
| `scripts/` | Install and uninstall, seed import, real-data leak check |
| `sample/seed.js` | The made-up demo items |
| `test/` | Tests for the rules and the import |
| `docs/manual-test.md` | Step-by-step manual test |
