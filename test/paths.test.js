import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { dataHome } from '../paths.js';

test('Windows keeps data in LOCALAPPDATA', () => {
  assert.equal(dataHome({ platform: 'win32', env: { LOCALAPPDATA: 'C:\\Users\\u\\AppData\\Local' }, home: 'C:\\Users\\u' }),
    'C:\\Users\\u\\AppData\\Local');
});

test('Windows falls back to AppData\\Local under the home folder', () => {
  assert.equal(dataHome({ platform: 'win32', env: {}, home: '/home/u' }), join('/home/u', 'AppData', 'Local'));
});

test('Linux and macOS use XDG_DATA_HOME, else ~/.local/share', () => {
  assert.equal(dataHome({ platform: 'linux', env: { XDG_DATA_HOME: '/x' }, home: '/home/u' }), '/x');
  assert.equal(dataHome({ platform: 'darwin', env: {}, home: '/home/u' }), join('/home/u', '.local', 'share'));
});
