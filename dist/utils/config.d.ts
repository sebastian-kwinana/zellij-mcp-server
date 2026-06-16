import { WindowsMCPConfig } from '../types/zellij.js';
export interface ZellijMCPConfig {
    windowsMcp: WindowsMCPConfig;
}
export declare function getConfigPath(): string;
export declare function loadConfig(): ZellijMCPConfig;
/** Resolve the effective Windows-MCP config, with optional per-call overrides. */
export declare function resolveWindowsMCPConfig(overrides?: Partial<WindowsMCPConfig>): WindowsMCPConfig;
//# sourceMappingURL=config.d.ts.map