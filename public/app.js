import {
  STATUSES, STATUS_LABELS, PLACES, PLACE_LABELS, SNOOZE_OPTIONS,
  wakeTimeFor, placeOf, changes, actionsFor, parseLabels, sortItems,
} from './core.js';

// ---------- state ----------

const state = {
  items: [],
  filter: remember('filter', 'active'),
  sort: { column: remember('sortColumn', 'id'), direction: remember('sortDirection', 'asc') },
  selectedId: null,
  editingId: null, // null = new item
};

const COLUMNS = [
  { id: 'id', label: 'ID' },
  { id: 'title', label: 'Title' },
  { id: 'project', label: 'Project' },
  { id: 'status', label: 'Status' },
  { id: 'place', label: 'Place' },
  { id: 'labels', label: 'Labels' },
  { id: 'createdAt', label: 'Created' },
  { id: 'completedAt', label: 'Completed' },
  { id: 'snoozeCount', label: 'Snoozed' },
  { id: 'wakeAt', label: 'Wakes' },
  { id: 'actions', label: '', sortable: false },
];

const ACTION_LABELS = {
  snooze: 'Snooze',
  wake: 'Wake',
  done: 'Done',
  settle: 'Settle',
  unsettle: 'Unsettle',
  archive: 'Archive',
  unarchive: 'Unarchive',
};

const $ = (id) => document.getElementById(id);

// ---------- per-viewer conveniences (never the data itself) ----------

function remember(key, fallback) {
  try { return localStorage.getItem(`pt.${key}`) ?? fallback; } catch { return fallback; }
}
function store(key, value) {
  try { localStorage.setItem(`pt.${key}`, value); } catch { /* ignore */ }
}

// ---------- server ----------

async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.statusText);
  return res.json();
}

async function loadItems() {
  try {
    state.items = (await request('GET', '/api/items')).items;
  } catch {
    toast('Could not reach the Practical Todo server.');
  }
  render();
}

async function patch(id, fields) {
  try {
    const updated = await request('PATCH', `/api/items/${id}`, fields);
    state.items = state.items.map((i) => (i.id === id ? updated : i));
    render();
    return updated;
  } catch (err) {
    toast(`Not saved: ${err.message}`);
    await loadItems();
  }
}

async function runAction(item, action, option) {
  const now = new Date();
  switch (action) {
    case 'snooze': {
      const updated = await patch(item.id, changes.snooze(item, option, now));
      if (updated) toast(updated.dormant ? `${item.id} is dormant until you wake it` : `${item.id} sleeps until ${formatWhen(updated.wakeAt)}`);
      return;
    }
    case 'wake': return patch(item.id, changes.wake());
    case 'done': return patch(item.id, changes.setStatus(item, 'done', now));
    case 'settle': return patch(item.id, changes.settle());
    case 'unsettle': return patch(item.id, changes.unsettle(item));
    case 'archive': return patch(item.id, changes.archive());
    case 'unarchive': return patch(item.id, changes.unarchive());
  }
}

// ---------- formatting ----------

const dateFmt = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short' });

// A plain date like "2026-08-30" has no time or zone; show it as that day, not shifted by the time zone.
function toDate(value) {
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return plain ? new Date(+plain[1], +plain[2] - 1, +plain[3]) : new Date(value);
}

function formatDate(value) {
  return value ? dateFmt.format(toDate(value)) : '';
}

function formatWhen(value, now = new Date()) {
  if (!value) return '';
  const d = new Date(value);
  const days = Math.round((startOfDay(d) - startOfDay(now)) / 86_400_000);
  const time = timeFmt.format(d);
  if (days === 0) return `Today ${time}`;
  if (days === 1) return `Tomorrow ${time}`;
  if (days > 1 && days < 7) return `${weekdayFmt.format(d)} ${time}`;
  return `${dateFmt.format(d)}, ${time}`;
}

function startOfDay(d) {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s.getTime();
}

function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else if (value !== undefined && value !== null && value !== false) node.setAttribute(key, value);
  }
  node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return node;
}

const badge = (text, kind) => el('span', { class: `badge badge-${kind}` }, text);
const labelChips = (labels) => (labels || []).map((l) => el('span', { class: 'chip' }, l));

// ---------- render ----------

function visibleItems(now) {
  const items = state.filter === 'all'
    ? state.items
    : state.items.filter((i) => placeOf(i, now) === state.filter);
  return sortItems(items, state.sort.column, state.sort.direction, now);
}

function render() {
  const now = new Date();
  const items = visibleItems(now);
  renderFilters(now);
  renderCards(items, now);
  renderTable(items, now);
  const title = state.filter === 'all' ? 'All items' : PLACE_LABELS[state.filter];
  $('view-title').textContent = title;
  $('view-count').textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}`;
  scheduleNextWake(now);
}

function renderFilters(now) {
  const counts = Object.fromEntries(PLACES.map((p) => [p, 0]));
  for (const item of state.items) counts[placeOf(item, now)]++;
  const options = [...PLACES.map((p) => [p, PLACE_LABELS[p], counts[p]]), ['all', 'All', state.items.length]];
  $('filters').replaceChildren(...options.map(([id, label, count]) =>
    el('button', {
      class: `filter filter-${id}${state.filter === id ? ' is-on' : ''}`,
      'aria-pressed': String(state.filter === id),
      onclick: () => { state.filter = id; store('filter', id); render(); },
    }, label, el('span', { class: 'filter-count' }, String(count)))));
}

function renderCards(items, now) {
  $('cards').replaceChildren(...items.map((item) => {
    const place = placeOf(item, now);
    return el('li', {},
      el('button', {
        class: `card place-${place}${item.id === state.selectedId ? ' is-selected' : ''}`,
        onclick: () => openEditor(item.id),
      },
      el('span', { class: 'card-title' }, item.title),
      el('span', { class: 'card-meta' },
        el('span', { class: 'id' }, item.id),
        item.project ? el('span', { class: 'project' }, item.project) : null,
        badge(STATUS_LABELS[item.status], item.status),
        place === 'sleeping' ? el('span', { class: 'wake' }, `wakes ${formatWhen(item.wakeAt, now)}`) : null,
        place === 'dormant' ? el('span', { class: 'wake' }, 'no wake time') : null,
        item.snoozeCount ? el('span', { class: 'snoozes', title: 'Times snoozed' }, `${item.snoozeCount}× snoozed`) : null,
      ),
      item.labels?.length ? el('span', { class: 'card-labels' }, labelChips(item.labels)) : null,
      ));
  }));
}

function renderTable(items, now) {
  $('table-head').replaceChildren(...COLUMNS.map((col) => {
    if (col.sortable === false) return el('th', { class: `col-${col.id}` }, col.label);
    const on = state.sort.column === col.id;
    return el('th', { class: `col-${col.id}`, 'aria-sort': on ? (state.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none' },
      el('button', { class: 'sort', onclick: () => setSort(col.id) },
        col.label, el('span', { class: 'arrow', 'aria-hidden': 'true' }, on ? (state.sort.direction === 'asc' ? '▲' : '▼') : '')));
  }));

  $('table-body').replaceChildren(...items.map((item) => {
    const place = placeOf(item, now);
    return el('tr', { class: item.id === state.selectedId ? 'is-selected' : '', dataset: { id: item.id } },
      el('td', { class: 'col-id' }, item.id),
      el('td', { class: 'col-title' }, el('button', { class: 'link', onclick: () => openEditor(item.id) }, item.title)),
      el('td', { class: 'col-project' }, item.project || ''),
      el('td', { class: 'col-status' }, statusSelect(item)),
      el('td', { class: 'col-place' }, badge(PLACE_LABELS[place], place)),
      el('td', { class: 'col-labels' }, labelChips(item.labels)),
      el('td', { class: 'col-createdAt' }, formatDate(item.createdAt)),
      el('td', { class: 'col-completedAt' }, formatDate(item.completedAt)),
      el('td', { class: `col-snoozeCount${item.snoozeCount >= 3 ? ' is-high' : ''}` }, item.snoozeCount ? String(item.snoozeCount) : ''),
      el('td', { class: 'col-wakeAt' }, place === 'sleeping' ? formatWhen(item.wakeAt, now) : place === 'dormant' ? '—' : ''),
      el('td', { class: 'col-actions' }, actionButtons(item, now)),
    );
  }));
  $('empty').hidden = items.length > 0;
}

function statusSelect(item) {
  return el('select', {
    class: `status-select status-${item.status}`,
    'aria-label': `Status of ${item.id}`,
    onchange: (e) => patch(item.id, changes.setStatus(item, e.target.value)),
  }, STATUSES.map((s) => el('option', { value: s, selected: s === item.status }, STATUS_LABELS[s])));
}

function actionButtons(item, now) {
  return el('span', { class: 'actions' }, actionsFor(item, now).map((action) =>
    el('button', {
      class: `btn btn-small action-${action}`,
      'aria-haspopup': action === 'snooze' ? 'menu' : null,
      onclick: (e) => {
        e.stopPropagation();
        if (action === 'snooze') openSnoozeMenu(item, e.currentTarget);
        else runAction(item, action);
      },
    }, ACTION_LABELS[action])));
}

function setSort(column) {
  if (state.sort.column === column) {
    state.sort.direction = state.sort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    state.sort.column = column;
    // Counts and dates read best newest or largest first.
    state.sort.direction = ['snoozeCount', 'createdAt', 'completedAt'].includes(column) ? 'desc' : 'asc';
  }
  store('sortColumn', state.sort.column);
  store('sortDirection', state.sort.direction);
  render();
}

// ---------- automatic wake ----------

let wakeTimer = null;
function scheduleNextWake(now) {
  clearTimeout(wakeTimer);
  const next = state.items
    .filter((i) => placeOf(i, now) === 'sleeping')
    .map((i) => new Date(i.wakeAt).getTime())
    .sort((a, b) => a - b)[0];
  // Re-render at the next wake time, and at least every minute so relative times stay right.
  const delay = Math.min(next ? next - now.getTime() + 250 : Infinity, 60_000);
  wakeTimer = setTimeout(render, Math.max(delay, 250));
}

// ---------- snooze menu ----------

const menu = $('snooze-menu');
let menuItemId = null;

function openSnoozeMenu(item, anchor) {
  if (menuItemId === item.id && !menu.hidden) return closeMenu();
  menuItemId = item.id;
  const now = new Date();
  menu.replaceChildren(
    el('div', { class: 'menu-head' }, `Snooze ${item.id}`),
    ...SNOOZE_OPTIONS.map((option) => {
      const wake = wakeTimeFor(option.id, now);
      return el('button', {
        class: 'menu-item', role: 'menuitem',
        onclick: () => {
          closeMenu();
          if (editor.open) editor.close();
          runAction(item, 'snooze', option.id);
        },
      }, el('span', {}, option.label), el('span', { class: 'menu-when' }, wake ? formatWhen(wake, now) : 'until I wake it'));
    }),
  );
  // A modal dialog blocks everything outside it, so the menu must live inside it there.
  (anchor.closest('dialog') || document.body).append(menu);
  menu.hidden = false;
  const rect = anchor.getBoundingClientRect();
  const width = menu.offsetWidth;
  const height = menu.offsetHeight;
  const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
  const below = rect.bottom + 4 + height < window.innerHeight;
  menu.style.left = `${left}px`;
  menu.style.top = `${below ? rect.bottom + 4 : Math.max(8, rect.top - height - 4)}px`;
  menu.querySelector('.menu-item')?.focus();
}

function closeMenu() {
  menu.hidden = true;
  menuItemId = null;
}

document.addEventListener('click', (e) => {
  if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('.action-snooze')) closeMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !menu.hidden) closeMenu();
});
window.addEventListener('resize', closeMenu);
document.querySelector('.table-wrap').addEventListener('scroll', closeMenu);

// ---------- editor ----------

const editor = $('editor');
const form = $('editor-form');

form.elements.status.replaceChildren(...STATUSES.map((s) => el('option', { value: s }, STATUS_LABELS[s])));

function openEditor(id = null) {
  closeMenu();
  state.editingId = id;
  const item = id === null ? null : state.items.find((i) => i.id === id);
  if (item) {
    state.selectedId = id;
    render();
  }
  $('editor-title').textContent = item ? `Edit ${item.id}` : 'New item';
  form.elements.title.value = item?.title ?? '';
  form.elements.project.value = item?.project ?? '';
  // Suggest existing projects while typing.
  $('projects').replaceChildren(...[...new Set(state.items.map((i) => i.project).filter(Boolean))].sort()
    .map((p) => el('option', { value: p })));
  form.elements.status.value = item?.status ?? 'todo';
  form.elements.labels.value = (item?.labels ?? []).join(', ');

  const now = new Date();
  const facts = item ? [
    ['Place', PLACE_LABELS[placeOf(item, now)]],
    ['Created', formatDate(item.createdAt)],
    ['Completed', formatDate(item.completedAt) || '—'],
    ['Snoozed', `${item.snoozeCount || 0}×`],
    ...(placeOf(item, now) === 'sleeping' ? [['Wakes', formatWhen(item.wakeAt, now)]] : []),
  ] : [];
  $('editor-facts').replaceChildren(...facts.flatMap(([k, v]) => [el('dt', {}, k), el('dd', {}, v)]));
  $('editor-facts').hidden = !item;

  $('editor-actions').replaceChildren(...(item ? actionsFor(item, now).map((action) =>
    el('button', {
      type: 'button',
      class: `btn btn-small action-${action}`,
      onclick: (e) => {
        if (action === 'snooze') return openSnoozeMenu(item, e.currentTarget);
        editor.close();
        runAction(item, action);
      },
    }, ACTION_LABELS[action])) : []));

  editor.showModal();
  form.elements.title.focus();
  form.elements.title.select();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = form.elements.title.value.trim();
  if (!title) return form.elements.title.focus();
  const status = form.elements.status.value;
  const project = form.elements.project.value.trim();
  const labels = parseLabels(form.elements.labels.value);
  editor.close();

  if (state.editingId === null) {
    try {
      const item = await request('POST', '/api/items', { title, project, status, labels });
      state.items.push(item);
      state.selectedId = item.id;
      // Show the new item: it lands in Active, or Settled when created as Done.
      const place = placeOf(item);
      if (state.filter !== 'all' && state.filter !== place) {
        state.filter = place;
        store('filter', place);
      }
      render();
    } catch (err) {
      toast(`Not saved: ${err.message}`);
    }
    return;
  }

  const item = state.items.find((i) => i.id === state.editingId);
  const fields = { title, project, labels };
  if (status !== item.status) Object.assign(fields, changes.setStatus(item, status));
  patch(item.id, fields);
});

$('editor-cancel').addEventListener('click', () => editor.close());
editor.addEventListener('close', closeMenu);
$('new-btn').addEventListener('click', () => openEditor(null));

document.addEventListener('keydown', (e) => {
  const typing = e.target.closest('input, select, textarea, dialog[open]');
  if (!typing && e.key === 'n' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    e.preventDefault();
    openEditor(null);
  }
});

// ---------- toast ----------

let toastTimer = null;
function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 3500);
}

// ---------- start ----------

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) loadItems();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

loadItems();
