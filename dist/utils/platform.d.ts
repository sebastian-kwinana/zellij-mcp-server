export type SupportedPlatform = 'windows' | 'mac' | 'linux' | 'other';
export declare function getPlatform(): SupportedPlatform;
export declare function isWindows(): boolean;
export declare function isMac(): boolean;
export declare function isLinux(): boolean;
/**
 * Human-readable platform label for status/error messages, e.g.
 * "linux (x64)".
 */
export declare function describePlatform(): string;
//# sourceMappingURL=platform.d.ts.map