// Made-up sample items. A new install starts with these so you can see how the
// app works; `npm run clear-samples` removes them. Times are relative to first
// run, so the sleeping items are still asleep when you first open the app.

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const SAMPLES = [
  { title: 'Plan the weekend hiking trip', project: 'Personal', status: 'doing', labels: ['outdoors', 'planning'], created: -3 * DAY },
  { title: 'Reply to the landlord about the lease renewal', project: 'Home', status: 'todo', labels: ['email'], created: -1 * DAY, snoozes: 2 },
  { title: 'Back up the laptop before the OS update', project: 'Home office', status: 'todo', labels: ['admin'], created: -9 * DAY, snoozes: 5 },
  { title: 'Try a Kanban view for this app', project: 'Practical Todo', status: 'todo', labels: ['idea'], created: -2 * DAY, snoozes: 1, wake: 4 * HOUR },
  { title: 'Renew domain name', project: 'Side project', status: 'todo', labels: ['admin', 'money'], created: -20 * DAY, snoozes: 7, wake: 2 * DAY },
  { title: 'Read the PWA install guidelines', project: 'Practical Todo', status: 'todo', labels: ['research'], created: -5 * DAY, snoozes: 1, wake: 18 * HOUR },
  { title: 'Learn to make sourdough', project: 'Personal', status: 'todo', labels: ['idea', 'cooking'], created: -40 * DAY, snoozes: 3, dormant: true },
  { title: 'Write a blog post on snooze counts', project: 'Side project', status: 'todo', labels: ['idea', 'writing'], created: -12 * DAY, snoozes: 4, dormant: true },
  { title: 'Clean out the garage', project: 'Home', status: 'done', labels: ['chores'], created: -15 * DAY, completed: -2 * DAY },
  { title: 'Pick a name for the to-do app', project: 'Practical Todo', status: 'done', labels: ['naming'], created: -6 * DAY, completed: -5 * DAY, snoozes: 1 },
  { title: 'Cancel the unused music subscription', project: 'Home', status: 'done', labels: ['money'], created: -30 * DAY, completed: -25 * DAY, archived: true },
];

export function sampleItems(now = new Date()) {
  const t = now.getTime();
  const at = (ms) => new Date(t + ms).toISOString();

  return SAMPLES.map((s, index) => ({
    id: `T${index + 1}`,
    title: s.title,
    project: s.project || '',
    status: s.status,
    labels: s.labels,
    createdAt: at(s.created),
    completedAt: s.completed ? at(s.completed) : null,
    snoozeCount: s.snoozes || 0,
    wakeAt: s.wake ? at(s.wake) : null,
    dormant: Boolean(s.dormant),
    settled: s.status === 'done',
    archived: Boolean(s.archived),
    sample: true,
  }));
}
