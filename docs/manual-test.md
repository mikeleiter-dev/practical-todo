# Practical Todo: manual test, first pass

Work through each step in order. Tick the box when the result matches **Expect**. If it doesn't, write what you saw under the step and carry on.

Parts 2 to 8 follow the acceptance criteria in [story.md](../story.md). **They use the demo**, with made-up items in a separate folder, so testing never changes your real items.

## 0 · Start fresh

- [ ] **0.1** Close any Practical Todo windows. In a terminal, reinstall the app and reset the demo:
  ```sh
  cd ~/Projects/practical-todo
  npm run app:install
  fuser -k 4318/tcp; rm -rf ~/.local/share/practical-todo-demo
  ```
  **Expect:** "Installed Practical Todo." (`fuser` may say nothing; that's fine.)

## 1 · It installs and opens like an app

- [ ] **1.1** Press Super + Space and type "todo".
  **Expect:** **Practical Todo** is listed with the purple-and-blue icon.
- [ ] **1.2** Open it.
  **Expect:** the app opens in its own window with no address bar, showing **your real items**. Click **All** and check the count matches your list. Don't change anything here. Close it.
- [ ] **1.3** Open it again from the launcher.
  **Expect:** it opens faster, because the server is still running. Close it.
- [ ] **1.4** Open the demo:
  ```sh
  bin/practical-todo --demo
  ```
  **Expect:** a separate app window with 11 made-up items. Click **All**: the filter counts add up to 11. **Use this window for parts 2 to 8.**

## 2 · The left list shows each item as a card

- [ ] **2.1** Click each filter in turn: Active, Sleeping, Dormant, Settled, Archived, All.
  **Expect:** each one changes both the cards and the table. The heading above the table shows the filter name and item count.
- [ ] **2.2** Look at the cards.
  **Expect:** each card shows title, ID (like `T4`), project if it has one, status, labels, and a coloured left edge (green Active, blue Sleeping, purple Dormant, grey Settled, tan Archived). Sleeping cards say when they wake. Snoozed items say "N× snoozed".
- [ ] **2.3** Confirm the cards are one flat list.
  **Expect:** no group headings on the left.
- [ ] **2.4** Select Sleeping, then close and reopen the demo.
  **Expect:** it reopens on Sleeping.

## 3 · The table can be sorted

- [ ] **3.1** Select **All**. Check the column headings.
  **Expect:** ID, Title, Project, Status, Place, Labels, Created, Completed, Snoozed, Wakes, then the action buttons.
- [ ] **3.2** Click **Title**, then click it again.
  **Expect:** A to Z with ▲, then Z to A with ▼.
- [ ] **3.3** Click **Created** and **Completed**.
  **Expect:** newest first. Empty Completed cells stay at the bottom both ways.
- [ ] **3.4** Click **ID**.
  **Expect:** numeric order: T2 comes before T10.

## 4 · Add and edit items

- [ ] **4.1** Click **+ New item**. Title: `Test add`. Project: start typing `Demo` and pick **Demo video** from the suggestions. Labels: `test, demo`. Save.
  **Expect:** it's in Active as **T12**, with its project, and today as Created.
- [ ] **4.2** Click somewhere empty on the page, then press **N**.
  **Expect:** the New item box opens. Press Esc to close it.
- [ ] **4.3** Click the title of T12 in the table. Change the title to `Test edit` and add the label `extra`. Save.
  **Expect:** the card and the table row both show the new title and labels.
- [ ] **4.4** Click a card on the left.
  **Expect:** the same edit box opens for that item, and its row is highlighted in the table.
- [ ] **4.5** Change T12's status to **Doing** using the drop-down in the table.
  **Expect:** it stays in Active, now showing Doing.

## 5 · Snooze

- [ ] **5.1** Select **Active**. Click **Snooze** on T12.
  **Expect:** a menu with 8 choices, each with its wake time beside it: 1 hour, 4 hours, 12 hours, Tomorrow, 2 days, 3 days, 1 week, No wake time.
- [ ] **5.2** Check the times in that menu.
  **Expect:** hour choices count from now. Tomorrow, 2 days, 3 days and 1 week all show **8:00 AM**.
- [ ] **5.3** Choose **1 hour**.
  **Expect:** a message says when it wakes. T12 leaves Active and appears under Sleeping with that wake time.
- [ ] **5.4** Open T12 from Sleeping, click **Snooze** inside the edit box, and choose **No wake time**.
  **Expect:** T12 moves to Dormant. The Wakes column shows "—".

## 6 · Items come back

- [ ] **6.1** Under Dormant, click **Wake** on T12.
  **Expect:** it goes back to Active.
- [ ] **6.2** Snooze T12 for **1 hour**. Leave the demo open, or close it. Come back after the hour.
  **Expect:** T12 is back in Active by itself, and the Sleeping count dropped by one.
- [ ] **6.3** The demo item "Try a Kanban view for this app" was set to wake about 4 hours after step 1.4. Check it later.
  **Expect:** it's in Active.
- [ ] **6.4** Under Sleeping, click **Wake** on any item.
  **Expect:** it goes to Active at once.

## 7 · Snooze count shows what I put off

- [ ] **7.1** Look at T12's Snoozed column.
  **Expect:** 3 (from steps 5.3, 5.4 and 6.2). Waking it didn't lower the count.
- [ ] **7.2** Select **All** and click **Snoozed**.
  **Expect:** most-snoozed first: "Renew domain name" (7) at the top. Counts of 3 or more show in orange.

## 8 · Done, Settled and Archived

- [ ] **8.1** In Active, click **Done** on T12.
  **Expect:** T12 moves to Settled with today as Completed.
- [ ] **8.2** Under Settled, click **Unsettle** on T12.
  **Expect:** it's back in Active as **To do**, and Completed is empty.
- [ ] **8.3** Mark T12 Done again. Under Settled, click **Archive**.
  **Expect:** it moves to Archived.
- [ ] **8.4** Under Archived, click **Unarchive**.
  **Expect:** it goes back to Settled.
- [ ] **8.5** Under Settled, click **Unsettle** on "Set up the new microphone". Then set its status back to **Done** with the drop-down.
  **Expect:** after unsettling it's Active as To do. Choosing Done settles it again.

## 9 · Final checks

- [ ] **9.1** Close the demo window. Stop the demo server and open the demo again:
  ```sh
  fuser -k 4318/tcp; bin/practical-todo --demo
  ```
  **Expect:** the launcher starts the server again, and everything you changed in the demo is still there.
- [ ] **9.2** With the demo open, run `fuser -k 4318/tcp`, then reload the window (Ctrl+R).
  **Expect:** the window still opens, with a message that it can't reach the server. Close it.
- [ ] **9.3** Open the real app from the launcher.
  **Expect:** your real items are unchanged. None of the test items (T12 "Test edit") are there.
- [ ] **9.4** Make a window narrow, about phone width.
  **Expect:** the list sits above the table and nothing runs off the side of the page. The table scrolls sideways inside itself.
- [ ] **9.5** Switch your system theme between light and dark.
  **Expect:** the app follows the theme and stays readable.
- [ ] **9.6** Confirm none of your real items have leaked into the repo:
  ```sh
  npm run check:data
  ```
  **Expect:** "OK: … No real data found."

## Notes

Write anything that felt wrong or slow here, even if the step passed.
