// Practical Todo core rules. Pure functions, shared by the browser app and the tests.

export const START_OF_DAY_HOUR = 8; // "start of the day" = 08:00 local time

export const STATUSES = ['todo', 'doing', 'done'];
export const STATUS_LABELS = { todo: 'To do', doing: 'Doing', done: 'Done' };

export const PLACES = ['active', 'sleeping', 'dormant', 'settled', 'archived'];
export const PLACE_LABELS = {
  active: 'Active',
  sleeping: 'Sleeping',
  dormant: 'Dormant',
  settled: 'Settled',
  archived: 'Archived',
};

// Snooze choices. `hours` counts from now; `days` lands on the start of that day.
export const SNOOZE_OPTIONS = [
  { id: '1h', label: '1 hour', hours: 1 },
  { id: '4h', label: '4 hours', hours: 4 },
  { id: '12h', label: '12 hours', hours: 12 },
  { id: '1d', label: 'Tomorrow', days: 1 },
  { id: '2d', label: '2 days', days: 2 },
  { id: '3d', label: '3 days', days: 3 },
  { id: '1w', label: '1 week', days: 7 },
  { id: 'none', label: 'No wake time' },
];

/** Wake time for a snooze option, or null when the option has no wake time. */
export function wakeTimeFor(optionId, now = new Date()) {
  const option = SNOOZE_OPTIONS.find((o) => o.id === optionId);
  if (!option) throw new Error(`Unknown snooze option: ${optionId}`);
  if (option.hours) return new Date(now.getTime() + option.hours * 3_600_000);
  if (option.days) {
    const wake = new Date(now);
    wake.setDate(wake.getDate() + option.days);
    wake.setHours(START_OF_DAY_HOUR, 0, 0, 0);
    return wake;
  }
  return null;
}

/** Where an item lives. Derived from its fields, so a passed wake time means Active.
 *  Place is separate from status: marking Done settles an item, but a Done item
 *  can stay Active and a settled item need not be Done. */
export function placeOf(item, now = new Date()) {
  if (item.archived) return 'archived';
  if (item.settled) return 'settled';
  if (item.dormant) return 'dormant';
  if (item.wakeAt && new Date(item.wakeAt) > now) return 'sleeping';
  return 'active';
}

const iso = (d) => (d ? new Date(d).toISOString() : null);

/** Every change returns the fields to merge into the item. */
export const changes = {
  snooze(item, optionId, now = new Date()) {
    const wake = wakeTimeFor(optionId, now);
    return {
      wakeAt: iso(wake),
      dormant: wake === null,
      snoozeCount: (item.snoozeCount || 0) + 1,
    };
  },
  wake() {
    return { wakeAt: null, dormant: false };
  },
  setStatus(item, status, now = new Date()) {
    if (!STATUSES.includes(status)) throw new Error(`Unknown status: ${status}`);
    if (status === 'done') {
      if (item.status === 'done') return { status }; // already done: leave place and date alone
      return { status, completedAt: iso(now), settled: true, wakeAt: null, dormant: false };
    }
    // Reopening a done item brings it back to Active.
    if (item.status === 'done') return { status, completedAt: null, settled: false, archived: false };
    return { status };
  },
  settle() {
    return { settled: true, wakeAt: null, dormant: false };
  },
  unsettle(item) {
    const reopen = item.status === 'done';
    return {
      settled: false,
      archived: false,
      status: reopen ? 'todo' : item.status,
      completedAt: reopen ? null : item.completedAt ?? null,
    };
  },
  archive() {
    return { archived: true };
  },
  unarchive() {
    return { archived: false };
  },
};

/** Actions available for an item in its current place. */
export function actionsFor(item, now = new Date()) {
  switch (placeOf(item, now)) {
    case 'active':
      return ['snooze', item.status === 'done' ? 'settle' : 'done'];
    case 'sleeping':
    case 'dormant':
      return ['wake', 'snooze', 'done'];
    case 'settled':
      return ['unsettle', 'archive'];
    case 'archived':
      return ['unarchive'];
  }
  return [];
}

/** Turns "a, b ,, c" into ["a", "b", "c"]. */
export function parseLabels(text) {
  return [...new Set(String(text).split(',').map((s) => s.trim()).filter(Boolean))];
}

/** Value used to sort a column. */
export function sortValue(item, column, now = new Date()) {
  switch (column) {
    case 'id':
      return idNumber(item.id);
    case 'title':
      return item.title.toLowerCase();
    case 'project':
      return (item.project || '').toLowerCase();
    case 'status':
      return STATUSES.indexOf(item.status);
    case 'place':
      return PLACES.indexOf(placeOf(item, now));
    case 'labels':
      return (item.labels || []).join(', ').toLowerCase();
    case 'createdAt':
    case 'completedAt':
      return item[column] || '';
    case 'wakeAt':
      return placeOf(item, now) === 'sleeping' ? item.wakeAt : '';
    case 'snoozeCount':
      return item.snoozeCount || 0;
  }
  return '';
}

export function sortItems(items, column, direction = 'asc', now = new Date()) {
  const sign = direction === 'desc' ? -1 : 1;
  return [...items].sort((a, b) => {
    const va = sortValue(a, column, now);
    const vb = sortValue(b, column, now);
    // Empty values always sort last.
    if (va === '' && vb !== '') return 1;
    if (vb === '' && va !== '') return -1;
    if (va < vb) return -1 * sign;
    if (va > vb) return 1 * sign;
    return idNumber(a.id) - idNumber(b.id);
  });
}

/** IDs look like "T83". The number orders them; old numeric IDs still work. */
export function idNumber(id) {
  const match = String(id).match(/\d+/);
  return match ? Number(match[0]) : 0;
}

export function nextId(items) {
  return `T${items.reduce((max, i) => Math.max(max, idNumber(i.id)), 0) + 1}`;
}

/** A new item with defaults filled in. */
export function newItem(id, fields, now = new Date()) {
  const status = STATUSES.includes(fields.status) ? fields.status : 'todo';
  return {
    id,
    title: String(fields.title || '').trim() || 'Untitled',
    project: String(fields.project || '').trim(),
    status,
    labels: Array.isArray(fields.labels) ? fields.labels : parseLabels(fields.labels || ''),
    createdAt: iso(now),
    completedAt: status === 'done' ? iso(now) : null,
    snoozeCount: 0,
    wakeAt: null,
    dormant: false,
    settled: status === 'done',
    archived: false,
  };
}
