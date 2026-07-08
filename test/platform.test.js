// Unit tests for platform detection helpers.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import {
  getPlatform,
  isWindows,
  isMac,
  isLinux,
  describePlatform,
} from '../dist/utils/platform.js';

test('getPlatform maps the current os.platform() to a supported label', () => {
  const expected =
    os.platform() === 'win32' ? 'windows'
    : os.platform() === 'darwin' ? 'mac'
    : os.platform() === 'linux' ? 'linux'
    : 'other';
  assert.equal(getPlatform(), expected);
});

test('exactly one (or zero) of the is* helpers is true, matching getPlatform', () => {
  const flags = [isWindows(), isMac(), isLinux()];
  const trueCount = flags.filter(Boolean).length;
  assert.ok(trueCount <= 1, 'at most one platform flag may be true');
  if (getPlatform() === 'other') {
    assert.equal(trueCount, 0);
  } else {
    assert.equal(trueCount, 1);
  }
});

test('describePlatform contains platform and architecture', () => {
  const desc = describePlatform();
  assert.ok(desc.includes(os.platform()), `expected "${desc}" to include ${os.platform()}`);
  assert.ok(desc.includes(os.arch()), `expected "${desc}" to include ${os.arch()}`);
});
