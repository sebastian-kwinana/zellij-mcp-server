// Unit tests for the configuration loader: defaults, config file, env-var
// overrides, per-call overrides, and precedence between them.

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { loadConfig, resolveWindowsMCPConfig, getConfigPath } from '../dist/utils/config.js';
import { cache } from '../dist/utils/cache.js';

const CONFIG_CACHE_KEY = 'zellij-mcp:config';
const ENV_KEYS = [
  'ZELLIJ_MCP_CONFIG',
  'ZELLIJ_WINMCP_TRANSPORT',
  'ZELLIJ_WINMCP_HOST',
  'ZELLIJ_WINMCP_PORT',
  'ZELLIJ_WINMCP_AUTH_KEY',
  'ZELLIJ_WINMCP_IP_ALLOWLIST',
  'ZELLIJ_WINMCP_CERT_FILE',
  'ZELLIJ_WINMCP_KEY_FILE',
];

let tmpDir;
const savedEnv = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
  cache.delete(CONFIG_CACHE_KEY);
  tmpDir = mkdtempSync(path.join(os.tmpdir(), 'zellij-mcp-config-test-'));
  // Point at a guaranteed-nonexistent file so a real ~/.zellij-mcp/config.json
  // on the host cannot leak into the tests.
  process.env.ZELLIJ_MCP_CONFIG = path.join(tmpDir, 'nonexistent.json');
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
  cache.delete(CONFIG_CACHE_KEY);
  rmSync(tmpDir, { recursive: true, force: true });
});

test('built-in defaults are secure: streamable-http on loopback', () => {
  const cfg = loadConfig().windowsMcp;
  assert.equal(cfg.transport, 'streamable-http');
  assert.equal(cfg.host, '127.0.0.1');
  assert.equal(cfg.port, 8000);
  assert.equal(cfg.installAsTask, false);
});

test('getConfigPath honours ZELLIJ_MCP_CONFIG', () => {
  assert.equal(getConfigPath(), process.env.ZELLIJ_MCP_CONFIG);
});

test('config file values override defaults', () => {
  const file = path.join(tmpDir, 'config.json');
  writeFileSync(file, JSON.stringify({ windowsMcp: { port: 9443, host: 'localhost' } }));
  process.env.ZELLIJ_MCP_CONFIG = file;
  cache.delete(CONFIG_CACHE_KEY);

  const cfg = loadConfig().windowsMcp;
  assert.equal(cfg.port, 9443);
  assert.equal(cfg.host, 'localhost');
  assert.equal(cfg.transport, 'streamable-http'); // untouched default
});

test('malformed config file falls back to defaults instead of crashing', () => {
  const file = path.join(tmpDir, 'broken.json');
  writeFileSync(file, '{ not json !');
  process.env.ZELLIJ_MCP_CONFIG = file;
  cache.delete(CONFIG_CACHE_KEY);

  const cfg = loadConfig().windowsMcp;
  assert.equal(cfg.port, 8000);
  assert.equal(cfg.transport, 'streamable-http');
});

test('environment variables override the config file', () => {
  const file = path.join(tmpDir, 'config.json');
  writeFileSync(file, JSON.stringify({ windowsMcp: { port: 9443, transport: 'sse' } }));
  process.env.ZELLIJ_MCP_CONFIG = file;
  process.env.ZELLIJ_WINMCP_PORT = '10443';
  process.env.ZELLIJ_WINMCP_TRANSPORT = 'streamable-http';
  process.env.ZELLIJ_WINMCP_HOST = 'localhost';
  cache.delete(CONFIG_CACHE_KEY);

  const cfg = loadConfig().windowsMcp;
  assert.equal(cfg.port, 10443);
  assert.equal(cfg.transport, 'streamable-http');
  assert.equal(cfg.host, 'localhost');
});

test('invalid env values are ignored in favour of the layer below', () => {
  process.env.ZELLIJ_WINMCP_PORT = 'not-a-number';
  process.env.ZELLIJ_WINMCP_TRANSPORT = 'ftp';
  cache.delete(CONFIG_CACHE_KEY);

  const cfg = loadConfig().windowsMcp;
  assert.equal(cfg.port, 8000);
  assert.equal(cfg.transport, 'streamable-http');
});

test('partially-numeric and out-of-range env ports are ignored, not coerced', () => {
  // parseInt used to accept "8000oops"->8000 and out-of-range "70000",
  // the latter then crashing validatePort at invocation. Both must now fall
  // back to the layer below (default 8000).
  for (const bad of ['8000oops', '70000', '80', '0', '-1', ' 8000', '3.14', '0x1f90']) {
    process.env.ZELLIJ_WINMCP_PORT = bad;
    cache.delete(CONFIG_CACHE_KEY);
    assert.equal(loadConfig().windowsMcp.port, 8000, `port env ${JSON.stringify(bad)} should be ignored`);
  }
  // A strict, in-range integer string still applies.
  process.env.ZELLIJ_WINMCP_PORT = '9443';
  cache.delete(CONFIG_CACHE_KEY);
  assert.equal(loadConfig().windowsMcp.port, 9443);
});

test('per-call overrides beat env vars and config file', () => {
  process.env.ZELLIJ_WINMCP_PORT = '10443';
  cache.delete(CONFIG_CACHE_KEY);

  const cfg = resolveWindowsMCPConfig({ port: 12000, host: 'localhost' });
  assert.equal(cfg.port, 12000);
  assert.equal(cfg.host, 'localhost');
});

test('undefined per-call overrides do not clobber resolved values', () => {
  const cfg = resolveWindowsMCPConfig({ port: undefined, host: undefined });
  assert.equal(cfg.port, 8000);
  assert.equal(cfg.host, '127.0.0.1');
});
