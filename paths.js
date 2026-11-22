// Where Practical Todo keeps item data. Never inside the repo.
//
//   Real data:  $XDG_DATA_HOME/practical-todo       (default ~/.local/share/practical-todo)
//   Demo data:  $XDG_DATA_HOME/practical-todo-demo  (made-up sample items only)
//
// PRACTICAL_TODO_DATA overrides the folder; PRACTICAL_TODO_DEMO=1 selects demo mode.
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEMO = process.env.PRACTICAL_TODO_DEMO === '1';

const dataHome = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share');

export const DATA_DIR = process.env.PRACTICAL_TODO_DATA
  || join(dataHome, DEMO ? 'practical-todo-demo' : 'practical-todo');

export const DATA_FILE = join(DATA_DIR, 'items.json');

export const PORT = Number(process.env.PORT || (DEMO ? 4318 : 4317));
