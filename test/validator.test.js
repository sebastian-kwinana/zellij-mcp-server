// Unit tests for the Windows-MCP integration validators.
// Run with: npm test  (node --test test/)

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Validator } from '../dist/utils/validator.js';

test('validatePort accepts registered/ephemeral ports', () => {
  for (const port of [1024, 8000, 8443, 65535]) {
    const r = Validator.validatePort(port);
    assert.equal(r.valid, true, `port ${port} should be valid: ${r.errors}`);
  }
});

test('validatePort rejects privileged, out-of-range, and non-integer ports', () => {
  for (const port of [0, 80, 1023, 65536, 70000, -1, 3.14, NaN, '8000']) {
    assert.equal(Validator.validatePort(port).valid, false, `port ${port} should be rejected`);
  }
});

test('validateHost accepts hostnames and IP literals', () => {
  for (const host of ['127.0.0.1', 'localhost', 'desktop-01.corp.local', '::1', '[::1]', '192.168.1.5']) {
    const r = Validator.validateHost(host);
    assert.equal(r.valid, true, `host ${host} should be valid: ${r.errors}`);
  }
});

test('validateHost rejects injection attempts and malformed values', () => {
  const bad = [
    '127.0.0.1; rm -rf /',
    'localhost && calc',
    'host`whoami`',
    'host$(id)',
    'host|nc',
    'a'.repeat(300),
    '',
    'host name with spaces',
    '-Force',   // PowerShell parameter-injection: leading dash must be rejected
    '-Action',
  ];
  for (const host of bad) {
    assert.equal(Validator.validateHost(host).valid, false, `host ${JSON.stringify(host)} should be rejected`);
  }
});

test('validateTransport allows only streamable-http and sse', () => {
  assert.equal(Validator.validateTransport('streamable-http').valid, true);
  assert.equal(Validator.validateTransport('sse').valid, true);
  for (const t of ['stdio', 'ftp', 'http', '', 'STREAMABLE-HTTP', 'sse; calc']) {
    assert.equal(Validator.validateTransport(t).valid, false, `transport ${JSON.stringify(t)} should be rejected`);
  }
});

test('validateCertPath accepts common certificate/key extensions', () => {
  for (const p of ['C:/certs/cert.pem', 'C:\\Users\\me\\.windows-mcp\\key.pem', 'ca.crt', 'server.cer', 'private.key']) {
    const r = Validator.validateCertPath(p);
    assert.equal(r.valid, true, `path ${p} should be valid: ${r.errors}`);
  }
});

test('validateCertPath rejects injection, wrong extensions, and oversized paths', () => {
  const bad = ['cert.pem; calc', 'cert.exe', 'cert', '"cert.pem"', "$env:TEMP\\x.pem'", 'a'.repeat(600) + '.pem', '', '-Force.pem'];
  for (const p of bad) {
    assert.equal(Validator.validateCertPath(p).valid, false, `path ${JSON.stringify(p)} should be rejected`);
  }
});

test('validateAuthKey enforces charset and length bounds', () => {
  assert.equal(Validator.validateAuthKey('abc123_DEF-xyz.9').valid, true);
  assert.equal(Validator.validateAuthKey('A'.repeat(256)).valid, true);
  for (const k of ['short', 'has space key', 'key;calc', 'key"quote', 'A'.repeat(257), '', '--force--', '-abcdefgh']) {
    assert.equal(Validator.validateAuthKey(k).valid, false, `key ${JSON.stringify(k)} should be rejected`);
  }
});

test('validateIpAllowlist accepts IPv4/IPv6 addresses and CIDR ranges', () => {
  for (const v of ['10.0.0.0/8', '10.0.0.0/8,192.168.1.5', '2001:db8::/32, ::1', '203.0.113.7']) {
    const r = Validator.validateIpAllowlist(v);
    assert.equal(r.valid, true, `allowlist ${v} should be valid: ${r.errors}`);
  }
});

test('validateIpAllowlist rejects injection and non-address content', () => {
  for (const v of ['10.0.0.0/8 | evil', '10.0.0.0/8; calc', 'example.com', 'a'.repeat(1100), '']) {
    assert.equal(Validator.validateIpAllowlist(v).valid, false, `allowlist ${JSON.stringify(v)} should be rejected`);
  }
});

test('pre-existing validators still behave (regression guard)', () => {
  assert.equal(Validator.validateSessionName('dev-session_1').valid, true);
  assert.equal(Validator.validateSessionName('bad;name').valid, false);
  assert.equal(Validator.validateCommand('echo hello').valid, true);
  assert.equal(Validator.validateCommand('echo hi; rm -rf /').valid, false);
});
