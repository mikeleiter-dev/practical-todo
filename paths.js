// Where Practical Todo keeps item data. Never inside the repo.
//
//   Windows:        %LOCALAPPDATA%\practical-todo        (demo: %LOCALAPPDATA%\practical-todo-demo)
//   Linux, macOS:   $XDG_DATA_HOME/practical-todo        (default ~/.local/share/practical-todo)
//                   $XDG_DATA_HOME/practical-todo-demo   (made-up sample items, for trying and testing)
//
// PRACTICAL_TODO_DATA overrides the folder; PRACTICAL_TODO_DEMO=1 or a --demo argument selects demo mode.
import { homedir } from 'node:os';
import { join } from 'node:path';

export const DEMO = process.env.PRACTICAL_TODO_DEMO === '1' || process.argv.includes('--demo');

export function dataHome({ platform = process.platform, env = process.env, home = homedir() } = {}) {
  if (platform === 'win32') return env.LOCALAPPDATA || join(home, 'AppData', 'Local');
  return env.XDG_DATA_HOME || join(home, '.local', 'share');
}

export const DATA_DIR = process.env.PRACTICAL_TODO_DATA
  || join(dataHome(), DEMO ? 'practical-todo-demo' : 'practical-todo');

export const DATA_FILE = join(DATA_DIR, 'items.json');

export const PORT = Number(process.env.PORT || (DEMO ? 4318 : 4317));
