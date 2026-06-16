import { ToolResponse } from '../types/zellij.js';
export interface WindowsMCPToolOptions {
    transport?: 'streamable-http' | 'sse';
    host?: string;
    port?: number;
    authKey?: string;
    ipAllowlist?: string;
    certFile?: string;
    keyFile?: string;
    force?: boolean;
}
export declare class WindowsMCPTools {
    private static shell;
    static setup(opts?: WindowsMCPToolOptions): Promise<ToolResponse>;
    static launch(opts?: WindowsMCPToolOptions): Promise<ToolResponse>;
    static status(opts?: WindowsMCPToolOptions): Promise<ToolResponse>;
    static stop(opts?: WindowsMCPToolOptions): Promise<ToolResponse>;
    static installTask(opts?: WindowsMCPToolOptions): Promise<ToolResponse>;
    private static run;
    private static buildArgs;
    private static resolveScriptPath;
    private static detectPowerShell;
    private static invoke;
    private static describeUrl;
}
//# sourceMappingURL=windows-mcp.d.ts.map