#!/usr/bin/env node
// Verification for the Windows-MCP integration.
//
// Runs anywhere. On non-Windows hosts it asserts that every tool is correctly
// guarded (returns a "Windows-only" message and takes no action). Everywhere it
// exercises the new validators. Build first: `npm run build`.

import os from 'os';
import { WindowsMCPTools } from './dist/tools/windows-mcp.js';
import { Validator } from './dist/utils/validator.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log(`✅ PASS: ${name}`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${name}`);
    failed++;
  }
}

const isWindows = os.platform() === 'win32';

// --- Platform guard (only meaningful off-Windows) ---
if (!isWindows) {
  for (const action of ['status', 'launch', 'setup', 'stop', 'installTask']) {
    const res = await WindowsMCPTools[action]({ port: 9443 });
    const txt = res?.content?.[0]?.text ?? '';
    check(`${action} is guarded off-Windows`, txt.includes('Windows-only'));
  }
} else {
  console.log('Running on Windows: skipping the off-Windows guard assertions.');
}

// --- Validators: accept good input ---
check('port 8000 accepted', Validator.validatePort(8000).valid);
check('host 127.0.0.1 accepted', Validator.validateHost('127.0.0.1').valid);
check('transport streamable-http accepted', Validator.validateTransport('streamable-http').valid);
check('transport sse accepted', Validator.validateTransport('sse').valid);
check('cert path accepted', Validator.validateCertPath('C:/certs/cert.pem').valid);
check('auth key accepted', Validator.validateAuthKey('abc123_DEF-xyz').valid);
check('ip allowlist accepted', Validator.validateIpAllowlist('10.0.0.0/8,192.168.1.5').valid);

// --- Validators: reject bad input ---
check('port 80 rejected', !Validator.validatePort(80).valid);
check('port 70000 rejected', !Validator.validatePort(70000).valid);
check('host injection rejected', !Validator.validateHost('127.0.0.1; rm -rf /').valid);
check('bogus transport rejected', !Validator.validateTransport('ftp').valid);
check('cert injection rejected', !Validator.validateCertPath('cert.pem; calc').valid);
check('short auth key rejected', !Validator.validateAuthKey('short').valid);
check('allowlist injection rejected', !Validator.validateIpAllowlist('10.0.0.0/8 | evil').valid);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
