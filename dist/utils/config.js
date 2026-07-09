// Configuration loader for zellij-mcp-server.
//
// The project previously had no configuration system; every value was a tool
// argument. The Windows-MCP integration introduces host-level defaults (port,
// transport, cert directory) that are awkward to pass on every call, so this
// module loads an optional JSON config file and layers environment variables
// over built-in defaults.
//
// Precedence (highest wins): explicit tool arguments > environment variables >
// config file > built-in defaults.
//
//   Config file:  ~/.zellij-mcp/config.json  (override with $ZELLIJ_MCP_CONFIG)
//   Env vars:     ZELLIJ_WINMCP_TRANSPORT, ZELLIJ_WINMCP_HOST,
//                 ZELLIJ_WINMCP_PORT, ZELLIJ_WINMCP_AUTH_KEY,
//                 ZELLIJ_WINMCP_IP_ALLOWLIST, ZELLIJ_WINMCP_CERT_FILE,
//                 ZELLIJ_WINMCP_KEY_FILE
import os from 'os';
import path from 'path';
import { readFileSync, existsSync } from 'fs';
import { cache } from './cache.js';
const CONFIG_CACHE_KEY = 'zellij-mcp:config';
const CONFIG_TTL_MS = 30_000;
const WINDOWS_MCP_DEFAULTS = {
    transport: 'streamable-http',
    host: '127.0.0.1',
    port: 8000,
    installAsTask: false,
};
export function getConfigPath() {
    return process.env.ZELLIJ_MCP_CONFIG || path.join(os.homedir(), '.zellij-mcp', 'config.json');
}
function readFileConfig() {
    const configPath = getConfigPath();
    if (!existsSync(configPath)) {
        return {};
    }
    try {
        return JSON.parse(readFileSync(configPath, 'utf8'));
    }
    catch (error) {
        // A malformed config should not crash the server; fall back to defaults.
        console.warn(`Failed to parse config at ${configPath}: ${error.message}`);
        return {};
    }
}
function normaliseTransport(value) {
    if (value === 'streamable-http' || value === 'sse') {
        return value;
    }
    return undefined;
}
/**
 * Parse a port from an env var strictly: only a pure-integer string within the
 * valid range applies. Partially-numeric ("8000oops"→8000) and out-of-range
 * values are ignored in favour of the layer below, matching this module's
 * "invalid env values are ignored" contract (and avoiding a later crash in
 * validatePort at tool-invocation time).
 */
function parseEnvPort(raw, fallback) {
    if (raw === undefined || !/^\d+$/.test(raw)) {
        return fallback;
    }
    const port = Number(raw);
    return port >= 1024 && port <= 65535 ? port : fallback;
}
function applyEnvOverrides(base) {
    const env = process.env;
    return {
        ...base,
        transport: normaliseTransport(env.ZELLIJ_WINMCP_TRANSPORT) ?? base.transport,
        host: env.ZELLIJ_WINMCP_HOST ?? base.host,
        port: parseEnvPort(env.ZELLIJ_WINMCP_PORT, base.port),
        authKey: env.ZELLIJ_WINMCP_AUTH_KEY ?? base.authKey,
        ipAllowlist: env.ZELLIJ_WINMCP_IP_ALLOWLIST ?? base.ipAllowlist,
        certFile: env.ZELLIJ_WINMCP_CERT_FILE ?? base.certFile,
        keyFile: env.ZELLIJ_WINMCP_KEY_FILE ?? base.keyFile,
    };
}
export function loadConfig() {
    const cached = cache.get(CONFIG_CACHE_KEY);
    if (cached) {
        return cached;
    }
    const fileConfig = readFileConfig();
    const merged = {
        windowsMcp: applyEnvOverrides({
            ...WINDOWS_MCP_DEFAULTS,
            ...(fileConfig.windowsMcp || {}),
        }),
    };
    cache.set(CONFIG_CACHE_KEY, merged, CONFIG_TTL_MS);
    return merged;
}
/** Resolve the effective Windows-MCP config, with optional per-call overrides. */
export function resolveWindowsMCPConfig(overrides) {
    const base = loadConfig().windowsMcp;
    return { ...base, ...stripUndefined(overrides) };
}
function stripUndefined(obj) {
    if (!obj)
        return {};
    return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined && v !== null));
}
//# sourceMappingURL=config.js.map