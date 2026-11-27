import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  wakeTimeFor, placeOf, changes, actionsFor, parseLabels, sortItems, newItem, nextId, SNOOZE_OPTIONS,
} from '../public/core.js';
import { sampleItems } from '../sample/seed.js';
import { convert } from '../scripts/import-seed.js';

// Saturday 22 Nov 2026, 14:30 local time.
const NOW = new Date(2026, 10, 22, 14, 30);
const item = (fields = {}) => ({ ...newItem('T1', { title: 'Test' }, NOW), ...fields });
const apply = (it, fields) => ({ ...it, ...fields });

test('hour snoozes count from now', () => {
  assert.equal(wakeTimeFor('1h', NOW).getTime(), NOW.getTime() + 3_600_000);
  assert.equal(wakeTimeFor('4h', NOW).getTime(), NOW.getTime() + 4 * 3_600_000);
  assert.equal(wakeTimeFor('12h', NOW).getTime(), NOW.getTime() + 12 * 3_600_000);
});

test('day and week snoozes wake at 8:00 am on that day', () => {
  for (const [id, day] of [['1d', 23], ['2d', 24], ['3d', 25], ['1w', 29]]) {
    assert.deepEqual(wakeTimeFor(id, NOW), new Date(2026, 10, day, 8, 0, 0, 0), id);
  }
});

test('tomorrow means the next calendar day, even just after midnight', () => {
  const lateNight = new Date(2026, 10, 22, 0, 30);
  assert.deepEqual(wakeTimeFor('1d', lateNight), new Date(2026, 10, 23, 8));
});

test('day snoozes roll over month ends', () => {
  assert.deepEqual(wakeTimeFor('1w', new Date(2026, 10, 28, 9)), new Date(2026, 11, 5, 8));
});

test('the menu offers the eight snooze choices', () => {
  assert.deepEqual(SNOOZE_OPTIONS.map((o) => o.id), ['1h', '4h', '12h', '1d', '2d', '3d', '1w', 'none']);
});

test('a timed snooze moves an item to Sleeping and it returns to Active when time is up', () => {
  const slept = apply(item(), changes.snooze(item(), '4h', NOW));
  assert.equal(placeOf(slept, NOW), 'sleeping');
  assert.equal(placeOf(slept, new Date(NOW.getTime() + 4 * 3_600_000 - 1)), 'sleeping');
  assert.equal(placeOf(slept, new Date(NOW.getTime() + 4 * 3_600_000)), 'active');
});

test('a snooze with no wake time moves an item to Dormant until woken', () => {
  const dormant = apply(item(), changes.snooze(item(), 'none', NOW));
  assert.equal(placeOf(dormant, NOW), 'dormant');
  assert.equal(placeOf(dormant, new Date(2030, 0, 1)), 'dormant');
  assert.equal(placeOf(apply(dormant, changes.wake()), NOW), 'active');
});

test('waking a sleeping item early returns it to Active', () => {
  const slept = apply(item(), changes.snooze(item(), '1w', NOW));
  assert.equal(placeOf(apply(slept, changes.wake()), NOW), 'active');
});

test('every snooze adds one to the count, including re-snoozing, and waking does not reset it', () => {
  let it = item();
  it = apply(it, changes.snooze(it, '1h', NOW));
  it = apply(it, changes.snooze(it, '1d', NOW));
  it = apply(it, changes.snooze(it, 'none', NOW));
  it = apply(it, changes.wake());
  assert.equal(it.snoozeCount, 3);
  const later = apply(it, changes.snooze(it, '1h', NOW));
  assert.equal(later.snoozeCount, 4);
  assert.equal(later.dormant, false, 'a timed re-snooze clears dormant');
});

test('marking Done sets the completion date and moves the item to Settled', () => {
  const slept = apply(item(), changes.snooze(item(), '1d', NOW));
  const done = apply(slept, changes.setStatus(slept, 'done', NOW));
  assert.equal(done.completedAt, NOW.toISOString());
  assert.equal(placeOf(done, NOW), 'settled');
  assert.equal(done.wakeAt, null);
});

test('unsettling returns an item to Active as To do and clears the completion date', () => {
  const done = apply(item(), changes.setStatus(item(), 'done', NOW));
  const back = apply(done, changes.unsettle(done));
  assert.equal(back.status, 'todo');
  assert.equal(back.completedAt, null);
  assert.equal(placeOf(back, NOW), 'active');
});

test('a settled item can be archived and unarchived', () => {
  const done = apply(item(), changes.setStatus(item(), 'done', NOW));
  const archived = apply(done, changes.archive());
  assert.equal(placeOf(archived, NOW), 'archived');
  assert.equal(placeOf(apply(archived, changes.unarchive()), NOW), 'settled');
});

test('each place offers the right actions', () => {
  assert.deepEqual(actionsFor(item(), NOW), ['snooze', 'done']);
  assert.deepEqual(actionsFor(item({ wakeAt: '2099-01-01T00:00:00Z' }), NOW), ['wake', 'snooze', 'done']);
  assert.deepEqual(actionsFor(item({ dormant: true }), NOW), ['wake', 'snooze', 'done']);
  assert.deepEqual(actionsFor(item({ status: 'done', settled: true }), NOW), ['unsettle', 'archive']);
  assert.deepEqual(actionsFor(item({ status: 'done', settled: true, archived: true }), NOW), ['unarchive']);
  assert.deepEqual(actionsFor(item({ status: 'done' }), NOW), ['snooze', 'settle'], 'done but still active');
});

test('a new item gets defaults and today as created date', () => {
  const it = newItem(7, { title: '  Call bank  ', labels: 'money, admin' }, NOW);
  assert.equal(it.id, 7);
  assert.equal(it.title, 'Call bank');
  assert.equal(it.status, 'todo');
  assert.deepEqual(it.labels, ['money', 'admin']);
  assert.equal(it.createdAt, NOW.toISOString());
  assert.equal(it.snoozeCount, 0);
});

test('labels are trimmed and de-duplicated', () => {
  assert.deepEqual(parseLabels(' a, b ,, a ,c '), ['a', 'b', 'c']);
});

test('sorting by snooze count shows what I put off most', () => {
  const items = [item({ id: 1, snoozeCount: 2 }), item({ id: 2, snoozeCount: 7 }), item({ id: 3, snoozeCount: 0 })];
  assert.deepEqual(sortItems(items, 'snoozeCount', 'desc', NOW).map((i) => i.id), [2, 1, 3]);
});

test('empty values sort last in both directions', () => {
  const items = [item({ id: 1, completedAt: null }), item({ id: 2, completedAt: '2026-11-01T00:00:00Z' })];
  assert.deepEqual(sortItems(items, 'completedAt', 'asc', NOW).map((i) => i.id), [2, 1]);
  assert.deepEqual(sortItems(items, 'completedAt', 'desc', NOW).map((i) => i.id), [2, 1]);
});

test('sample data has 6 to 12 items covering every place', () => {
  const items = sampleItems(NOW);
  assert.ok(items.length >= 6 && items.length <= 12);
  const places = new Set(items.map((i) => placeOf(i, NOW)));
  assert.deepEqual([...places].sort(), ['active', 'archived', 'dormant', 'settled', 'sleeping']);
  assert.deepEqual(items.map((i) => i.id), items.map((_, n) => `T${n + 1}`));
  assert.ok(items.every((i) => i.sample === true), 'samples are flagged so clear-samples can remove them');
});

test('place is separate from status: a Done item can stay Active, a To do item can be Settled', () => {
  assert.equal(placeOf(item({ status: 'done' }), NOW), 'active');
  assert.equal(placeOf(item({ status: 'todo', settled: true }), NOW), 'settled');
  const settled = apply(item({ status: 'done' }), changes.settle());
  assert.equal(placeOf(settled, NOW), 'settled');
});

test('unsettling a settled item that is not Done keeps its status', () => {
  const it = item({ status: 'doing', settled: true });
  const back = apply(it, changes.unsettle(it));
  assert.equal(back.status, 'doing');
  assert.equal(placeOf(back, NOW), 'active');
});

test('reopening a Done item from the status menu brings it back to Active', () => {
  const done = apply(item(), changes.setStatus(item(), 'done', NOW));
  const reopened = apply(done, changes.setStatus(done, 'doing', NOW));
  assert.equal(placeOf(reopened, NOW), 'active');
  assert.equal(reopened.completedAt, null);
});

test('new IDs continue the T-number series', () => {
  assert.equal(nextId([]), 'T1');
  assert.equal(nextId([{ id: 'T9' }, { id: 'T12' }, { id: 'T3' }]), 'T13');
  assert.equal(nextId([{ id: 4 }]), 'T5', 'old numeric ids still count');
});

test('IDs sort by number, not as text', () => {
  const items = [item({ id: 'T10' }), item({ id: 'T9' }), item({ id: 'T100' })];
  assert.deepEqual(sortItems(items, 'id', 'asc', NOW).map((i) => i.id), ['T9', 'T10', 'T100']);
});

test('seed import maps focus and status to places', () => {
  const base = { title: 'Made-up', project: 'P', labels: [], added: '2026-01-02', started: null,
    completed: null, wake_at: null, snooze_count: 0, estimated_dates: ['added'] };
  const { items, problems } = convert({ items: [
    { ...base, id: 'T1', status: 'To do', focus: 'Active' },
    { ...base, id: 'T2', status: 'To do', focus: 'Sleeping' },
    { ...base, id: 'T3', status: 'Done', focus: 'Settled', completed: '2026-02-03' },
    { ...base, id: 'T4', status: 'To do', focus: 'Settled' },
    { ...base, id: 'T5', status: 'Done', focus: 'Active' },
    { ...base, id: 'T6', status: 'Doing', focus: 'Sleeping', wake_at: '2099-01-01T08:00:00Z', snooze_count: 2 },
  ] });
  assert.deepEqual(problems, []);
  assert.deepEqual(items.map((i) => placeOf(i, NOW)), ['active', 'dormant', 'settled', 'settled', 'active', 'sleeping']);
  assert.deepEqual(items.map((i) => i.status), ['todo', 'todo', 'done', 'todo', 'done', 'doing']);
  assert.equal(items[2].completedAt, '2026-02-03');
  assert.equal(items[0].createdAt, '2026-01-02');
  assert.deepEqual(items[0].estimatedDates, ['createdAt']);
  assert.equal(items[5].snoozeCount, 2);
});

test('seed import refuses unknown fields and values instead of dropping them', () => {
  const { problems } = convert({ items: [
    { id: 'T1', title: 'x', status: 'Maybe', focus: 'Active', colour: 'red' },
    { id: 'T1', title: 'y', status: 'To do', focus: 'Later' },
  ] });
  assert.equal(problems.length, 4);
});
