# Practical Todo: first pass

## Story

As someone who collects ideas faster than I can act on them,
I need one place that shows what I am working on now, holds everything else aside until its time, and shows what I keep putting off,
so that I can focus on today's work without losing an idea or fooling myself about what I avoid.

## Scope and use case

I open Practical Todo on this machine like any other app. On the left I see a list of my items. In the center and right I see them in a table that I can sort. When something is not for now, I snooze it. It leaves my active list and comes back when its time is up. If I don't set a wake time, it stays asleep until I wake it. Every item counts how many times I have snoozed it, so the things I avoid stand out.

Items move between five places, separately from their status (To do, Doing, Done):

| Place | Meaning | Leaves by |
|---|---|---|
| Active | What I am working on | Snooze, or mark Done |
| Sleeping | Snoozed with a wake time | Wake time arrives, or I wake it |
| Dormant | Snoozed with no wake time | I wake it |
| Settled | Done | I unsettle it, or archive it |
| Archived | Out of the way, still kept | I unarchive it |

**In:** installable app on this machine, 6 to 12 made-up items, add, edit, sort, snooze, wake, settle, archive.

**Added after the first pass:** my real items live outside the repo in `~/.local/share/practical-todo/`, with a separate demo. Items have a project. Settled is kept separate from status.

**Out, for later passes:** Kanban and other views, grouping, due dates, reminders and notifications, use on other devices, my own list of snooze choices and start-of-day time, deleting items (archive does that job for now).

## Acceptance criteria

1. **It installs and opens like an app.** On first open it shows 6 to 12 made-up items. My changes are still there after I close and reopen it. Test data stays separate from where my real data will go.
2. **The left list shows each item as a card.** It shows every Active item by default. I can filter it to Sleeping, Dormant, Settled, Archived or All. It has no grouping.
3. **The table shows ID, title, status, labels, created date, completion date, snooze count and wake time.** I can sort by any column.
4. **I can add an item and edit its title, status and labels.** The app gives it an ID and a created date automatically.
5. **I can snooze any item for 1, 4 or 12 hours, until tomorrow, 2 days, 3 days or 1 week, or with no wake time.** Day and week snoozes wake at the start of that day, 8:00 am. A timed snooze moves the item to Sleeping. No wake time moves it to Dormant.
6. **A sleeping item returns to Active by itself when its time is up,** also when the app was closed at that time. I can wake any Sleeping or Dormant item early.
7. **Each snooze adds 1 to the item's snooze count, and the count never resets.** Sorting by it shows what I put off most.
8. **When I mark an item Done, it gets today's completion date and moves to Settled.** Unsettling returns it to Active as To do and clears the completion date. I can archive a settled item and still find it under Archived.

## Build tasks

1. Set up the installable app shell and the small local server that hosts it.
2. Store items in one JSON file through one storage module, with demo data kept apart.
3. Write the 6 to 12 made-up sample items.
4. Build the left card list and its place filter.
5. Build the sortable table.
6. Build add and edit for items.
7. Build snooze, wake, and automatic return when the wake time passes.
8. Build Done, settle, unsettle, archive and unarchive.
