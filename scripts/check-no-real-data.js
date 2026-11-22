// Check that no real item data has leaked into the repo.
//
//   node scripts/check-no-real-data.js [extra-file ...]
//
// Reads the real data file (outside the repo) at run time and searches every
// file git would commit, plus any extra files given (such as a commit message
// draft), for item titles and project names. Prints where matches are, never
// the matched text. Exits 1 if it finds any.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DATA_FILE } from '../paths.js';

if (process.env.PRACTICAL_TODO_DEMO === '1') {
  console.error('Run this without PRACTICAL_TODO_DEMO, so it checks your real data.');
  process.exit(2);
}
if (!existsSync(DATA_FILE)) {
  console.log(`No real data at ${DATA_FILE}; nothing to check against.`);
  process.exit(0);
}

const { items = [] } = JSON.parse(await readFile(DATA_FILE, 'utf8'));
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ');
const needles = new Map(); // text -> kind
for (const item of items) {
  if (item.title?.trim().length >= 8) needles.set(norm(item.title.trim()), `title of ${item.id}`);
  if (item.project?.trim().length >= 4) needles.set(norm(item.project.trim()), 'a project name');
}

// Files git would commit: tracked plus untracked-but-not-ignored.
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
  .split('\0').filter(Boolean).concat(process.argv.slice(2));

let hits = 0;
for (const file of files) {
  if (!existsSync(file)) continue;
  const text = norm(await readFile(file, 'utf8').catch(() => ''));
  for (const [needle, kind] of needles) {
    const at = text.indexOf(needle);
    // Project names can be ordinary words, so only count them as whole words.
    if (at === -1) continue;
    if (kind === 'a project name' && !new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text)) continue;
    console.log(`${file}: contains ${kind}`);
    hits++;
  }
}

if (hits) {
  console.log(`\n${hits} match(es). Review these before committing. Project names that are common words may be false alarms.`);
  process.exit(1);
}
console.log(`OK: ${files.length} files checked against ${needles.size} titles and project names. No real data found.`);
