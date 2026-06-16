import { ValidationResult } from '../types/zellij.js';
export declare class Validator {
    static validateSessionName(name: string): ValidationResult;
    static validateCommand(command: string): ValidationResult;
    static validatePluginUrl(url: string): ValidationResult;
    static validateDirection(direction: string): ValidationResult;
    static validateSplitDirection(direction: string): ValidationResult;
    static validateResizeAmount(amount: string): ValidationResult;
    static validateText(text: string): ValidationResult;
    static validateString(value: string, fieldName: string, maxLength?: number): ValidationResult;
    private static readonly ARG_INJECTION;
    static validatePort(port: number): ValidationResult;
    static validateHost(host: string): ValidationResult;
    static validateTransport(transport: string): ValidationResult;
    static validateCertPath(value: string, fieldName?: string): ValidationResult;
    static validateAuthKey(key: string): ValidationResult;
    static validateIpAllowlist(value: string): ValidationResult;
    private static commandCounts;
    static checkRateLimit(identifier: string, maxRequests?: number, windowMs?: number): boolean;
}
//# sourceMappingURL=validator.d.ts.map