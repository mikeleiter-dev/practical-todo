# Practical To-Do

A personal to-do app for keeping track of ideas and projects, putting items aside until later, and seeing what keeps getting postponed.

## From the Practical AI channel

Practical Todo is built step by step, with an AI coding agent, on **[Mike Leiter | Practical AI](https://www.youtube.com/@mikeleiterdev)**. Watch the build, then clone this repo to run the same app yourself. Each video's version is tagged, starting with `0.1.0`.

The plain-language user story that drove the first pass is in [story.md](story.md).

## Current stage

**First pass.** Built and used on Linux. It also runs on Windows and macOS with `npm start`. Your items live outside the repo, in your home folder.

What it does:
- Shows your items as a card list and a sortable table, with ID, project, labels, status and dates.
- Keeps items in five places: **Active**, **Sleeping** (snoozed until a wake time), **Dormant** (snoozed with no wake time), **Settled** (done) and **Archived**.
- Snoozes items for 1, 4 or 12 hours, until tomorrow, 2 days, 3 days or a week. Day snoozes wake at 8:00 am, and sleeping items return to Active by themselves.
- Counts every snooze, so sorting by **Snoozed** shows what you keep putting off.

## Install

You need [Node.js](https://nodejs.org/) 20 or newer, Git, and a Chromium-based browser (Chrome, Edge, Brave or Chromium). There are no packages to install, so you don't need `npm install`. Run the commands in any terminal (PowerShell, Command Prompt or a Linux/macOS terminal).

```sh
git clone https://github.com/mikeleiter-dev/practical-todo.git
cd practical-todo
```

### Windows and macOS (or Linux without systemd)

```sh
npm start
```

Open http://localhost:4317 in Chrome or Edge. To install it as an app, click the install icon at the right end of the address bar (or menu → Apps → Install Practical Todo). The app works only while `npm start` is running.

Keep that terminal open while you use the app. To stop the server, press Ctrl+C in that terminal. To restart it (for example after `npm run clear-samples` or `npm run import`), press Ctrl+C, then run `npm start` again.

### Linux with systemd

```sh
npm run app:install
```

This adds **Practical Todo** to your app launcher. It also adds a background service for the small local server that saves your items. Nothing needs root.

## Open it (Linux launcher)

Open **Practical Todo** from your app launcher. On Omarchy, press Super + Space and type "todo".

The app opens in its own window. If the server isn't running, the launcher starts it first. The server keeps running after you close the window, so the app opens instantly next time.

To try the app with made-up items instead of your own, run `bin/practical-todo --demo`. On any system, `npm run demo` starts the demo server on http://localhost:4318.

## Your items

Your items are kept in one file outside the repo:

| | Folder | Used by |
|---|---|---|
| **Your items** | `~/.local/share/practical-todo/items.json` | The installed app, `npm start` |
| **Demo items** | `~/.local/share/practical-todo-demo/items.json` | `bin/practical-todo --demo`, `npm run demo` |

`~` is your home folder. On Windows that is `C:\Users\<you>`, so your items are in `C:\Users\<you>\.local\share\practical-todo\items.json`. These follow the Linux convention for app data (`$XDG_DATA_HOME`). Back up the first folder to keep your items safe.

**First run:** a new list starts with 11 made-up sample items, so you can see how everything works. When you're ready for your own list, run `npm run clear-samples`, then restart the server (Linux: `systemctl --user restart practical-todo`; otherwise Ctrl+C and `npm start`). That removes the samples, including any you edited, and keeps everything you added. A backup of the old file is kept.

**Bring in items from a seed file:**
```sh
npm run import -- /path/to/seed-tasks.json            # into an empty list
npm run import -- /path/to/seed-tasks.json --replace  # overwrite; keeps a .bak copy
```
Then restart the server as above.
The import maps the seed's `focus` and `status` onto Practical Todo's places and stops, without importing, if a field or value isn't recognised.

**Keeping real data out of git** (if you work on the code): none of your items, titles or project names belong in the repo, its tests, docs or commit messages. Before every commit, run:
```sh
npm run check:data
```
It reads your real items and searches every file git would commit. It reports file names only, never the matched text.

## Manage it (Linux launcher and service)

On Windows and macOS, stop either server with Ctrl+C in its terminal, and update after pulling new code by restarting `npm start`.

| To | Run |
|---|---|
| Update after pulling new code | `npm run app:install` (this also restarts the server) |
| Stop the server | `systemctl --user stop practical-todo` |
| See server logs | `journalctl --user -u practical-todo` |
| Start the server at every login | `systemctl --user enable practical-todo` |
| Stop the demo server | `fuser -k 4318/tcp` |
| Start the demo over | stop the demo server, then delete `~/.local/share/practical-todo-demo` |
| Remove the sample items | `npm run clear-samples`, then restart the server |
| Remove the app | `npm run app:uninstall` (your items are kept) |

## Develop and test

- `npm run demo` runs the demo server in the terminal on http://localhost:4318. `npm start` does the same with your real items on http://localhost:4317.
- `npm test` checks the rules: snooze times, places, snooze counts, sorting and the seed import. The tests use made-up data only.
- [docs/manual-test.md](docs/manual-test.md) is a step-by-step manual test of every acceptance criterion, run against the demo.
- The `PRACTICAL_TODO_DATA` and `PORT` environment variables override the data folder and port (for example `PORT=5000 npm start` on Linux/macOS, or `$env:PORT=5000; npm start` in PowerShell).

## Code layout

| Path | What it holds |
|---|---|
| `public/core.js` | The rules: places, snooze times, state changes, sorting, IDs |
| `public/app.js` | The screen: card list, filter, table, snooze menu, editor |
| `server.js` | Hosts the app and saves items |
| `paths.js` | Where the real and demo data live |
| `bin/practical-todo` | Launcher: starts the server if needed, opens the app window |
| `scripts/` | Install and uninstall, seed import, real-data leak check |
| `sample/seed.js` | The made-up sample items |
| `test/` | Tests for the rules and the import |
| `docs/manual-test.md` | Step-by-step manual test |

## License

[MIT](LICENSE)
