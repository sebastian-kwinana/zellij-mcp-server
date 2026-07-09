export class Validator {
    // Session name validation
    static validateSessionName(name) {
        const errors = [];
        if (!name || typeof name !== 'string') {
            errors.push('Session name is required and must be a string');
        }
        else {
            // Check for dangerous characters
            if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
                errors.push('Session name can only contain alphanumeric characters, underscores, and hyphens');
            }
            if (name.length > 64) {
                errors.push('Session name must be 64 characters or less');
            }
            if (name.length < 1) {
                errors.push('Session name cannot be empty');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            sanitized: name?.trim()
        };
    }
    // Command validation to prevent injection
    static validateCommand(command) {
        const errors = [];
        if (!command || typeof command !== 'string') {
            errors.push('Command is required and must be a string');
        }
        else {
            // Check for dangerous patterns
            const dangerousPatterns = [
                /[;&|`$(){}[\]]/, // Command separators and expansions
                /\.\./, // Directory traversal
                /rm\s+-rf/, // Dangerous rm commands
                /sudo/, // Privilege escalation
                /curl.*\|.*sh/, // Pipe to shell
                /wget.*\|.*sh/, // Pipe to shell
            ];
            for (const pattern of dangerousPatterns) {
                if (pattern.test(command)) {
                    errors.push(`Command contains potentially dangerous pattern: ${pattern.source}`);
                }
            }
            if (command.length > 1000) {
                errors.push('Command is too long (max 1000 characters)');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            sanitized: command?.trim()
        };
    }
    // Plugin URL validation
    static validatePluginUrl(url) {
        const errors = [];
        if (!url || typeof url !== 'string') {
            errors.push('Plugin URL is required and must be a string');
        }
        else {
            // Allow file:, http:, https:, and zellij: protocols
            const validProtocols = /^(file:|https?:|zellij:)/;
            if (!validProtocols.test(url)) {
                errors.push('Plugin URL must use file:, http:, https:, or zellij: protocol');
            }
            // Prevent local file system access outside of reasonable paths
            if (url.startsWith('file:')) {
                if (url.includes('..')) {
                    errors.push('Plugin file path cannot contain directory traversal (..)');
                }
                if (!url.match(/file:\/\/(\/tmp\/|\/home\/|\/usr\/share\/|\.\/)/)) {
                    errors.push('Plugin file path must be in allowed directories (/tmp, /home, /usr/share, or relative)');
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            sanitized: url?.trim()
        };
    }
    // Direction validation
    static validateDirection(direction) {
        const errors = [];
        const validDirections = ['left', 'right', 'up', 'down', 'next', 'previous'];
        if (!direction || typeof direction !== 'string') {
            errors.push('Direction is required and must be a string');
        }
        else if (!validDirections.includes(direction.toLowerCase())) {
            errors.push(`Direction must be one of: ${validDirections.join(', ')}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            sanitized: direction?.toLowerCase()
        };
    }
    // Split direction validation
    static validateSplitDirection(direction) {
        const errors = [];
        const validDirections = ['right', 'down'];
        if (!direction || typeof direction !== 'string') {
            errors.push('Split direction is required and must be a string');
        }
        else if (!validDirections.includes(direction.toLowerCase())) {
            errors.push(`Split direction must be one of: ${validDirections.join(', ')}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            sanitized: direction?.toLowerCase()
        };
    }
    // Resize amount validation
    static validateResizeAmount(amount) {
        const errors = [];
        const validAmounts = ['increase', 'decrease'];
        if (!amount || typeof amount !== 'string') {
            errors.push('Resize amount is required and must be a string');
        }
        else if (!validAmounts.includes(amount.toLowerCase())) {
            errors.push(`Resize amount must be one of: ${validAmounts.join(', ')}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            sanitized: amount?.toLowerCase()
        };
    }
    // Text content validation (for writing to panes)
    static validateText(text) {
        const errors = [];
        if (!text || typeof text !== 'string') {
            errors.push('Text is required and must be a string');
        }
        else {
            if (text.length > 10000) {
                errors.push('Text is too long (max 10000 characters)');
            }
            // Check for potentially dangerous escape sequences
            if (/\x1b\[[0-9;]*[mGKH]/.test(text)) {
                errors.push('Text contains ANSI escape sequences which may be dangerous');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            sanitized: text
        };
    }
    // Generic string validation
    static validateString(value, fieldName, maxLength = 256) {
        const errors = [];
        if (!value || typeof value !== 'string') {
            errors.push(`${fieldName} is required and must be a string`);
        }
        else {
            if (value.length > maxLength) {
                errors.push(`${fieldName} is too long (max ${maxLength} characters)`);
            }
            if (value.trim().length === 0) {
                errors.push(`${fieldName} cannot be empty`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            sanitized: value?.trim()
        };
    }
    // ----- Windows-MCP integration validators -----
    // These guard values that are forwarded to the PowerShell launcher and on to
    // `windows-mcp`. Arguments are always passed as a typed argv array (never
    // interpolated into a command string), but we still reject shell/argument
    // metacharacters as defence in depth.
    static ARG_INJECTION = /[;&|`$(){}<>\n\r"']/;
    static validatePort(port) {
        const errors = [];
        if (typeof port !== 'number' || !Number.isInteger(port)) {
            errors.push('Port must be an integer');
        }
        else if (port < 1024 || port > 65535) {
            errors.push('Port must be between 1024 and 65535');
        }
        return { valid: errors.length === 0, errors, sanitized: port };
    }
    static validateHost(host) {
        const errors = [];
        const trimmed = typeof host === 'string' ? host.trim() : host;
        if (!trimmed || typeof trimmed !== 'string') {
            errors.push('Host is required and must be a string');
        }
        else if (trimmed.startsWith('-')) {
            // A leading '-' lets PowerShell's parameter binder treat the value as a
            // switch (e.g. -Force) instead of the -BindHost value, even though Node
            // passes an argv array. Hostnames never start with '-' (RFC 1123).
            errors.push('Host must not start with "-"');
        }
        else if (this.ARG_INJECTION.test(trimmed)) {
            errors.push('Host contains invalid characters');
        }
        else if (!/^[a-zA-Z0-9_.\-:[\]]+$/.test(trimmed) || trimmed.length > 255) {
            errors.push('Host must be a valid hostname or IP address (max 255 chars)');
        }
        return { valid: errors.length === 0, errors, sanitized: trimmed };
    }
    static validateTransport(transport) {
        const errors = [];
        const valid = ['streamable-http', 'sse'];
        if (!transport || typeof transport !== 'string') {
            errors.push('Transport is required and must be a string');
        }
        else if (!valid.includes(transport)) {
            errors.push(`Transport must be one of: ${valid.join(', ')}`);
        }
        return { valid: errors.length === 0, errors, sanitized: transport };
    }
    static validateCertPath(value, fieldName = 'Certificate path') {
        const errors = [];
        const trimmed = typeof value === 'string' ? value.trim() : value;
        if (!trimmed || typeof trimmed !== 'string') {
            errors.push(`${fieldName} is required and must be a string`);
        }
        else if (trimmed.startsWith('-')) {
            // Prevent a path like "-Force.pem" binding as a PowerShell switch.
            errors.push(`${fieldName} must not start with "-"`);
        }
        else if (this.ARG_INJECTION.test(trimmed)) {
            errors.push(`${fieldName} contains invalid characters`);
        }
        else if (!/\.(pem|crt|cer|key)$/i.test(trimmed)) {
            errors.push(`${fieldName} must end with .pem, .crt, .cer, or .key`);
        }
        else if (trimmed.length > 512) {
            errors.push(`${fieldName} is too long (max 512 characters)`);
        }
        return { valid: errors.length === 0, errors, sanitized: trimmed };
    }
    static validateAuthKey(key) {
        const errors = [];
        const trimmed = typeof key === 'string' ? key.trim() : key;
        if (typeof trimmed !== 'string') {
            errors.push('Auth key must be a string');
        }
        else if (trimmed.startsWith('-')) {
            // A leading '-' could bind as a PowerShell switch when forwarded as
            // -AuthKey <value>. (URL-safe tokens may begin with '-'; on the rare
            // occasion one does, regenerate it — failing closed is the safe choice.)
            errors.push('Auth key must not start with "-"');
        }
        else if (!/^[A-Za-z0-9._\-]{8,256}$/.test(trimmed)) {
            errors.push('Auth key must be 8-256 chars of letters, digits, dot, underscore, or hyphen');
        }
        return { valid: errors.length === 0, errors, sanitized: trimmed };
    }
    static validateIpAllowlist(value) {
        const errors = [];
        if (typeof value !== 'string') {
            errors.push('IP allowlist must be a string');
        }
        else if (this.ARG_INJECTION.test(value)) {
            errors.push('IP allowlist contains invalid characters');
        }
        else if (!/^[0-9a-fA-F:.\/, ]+$/.test(value) || value.length > 1024) {
            errors.push('IP allowlist must be comma-separated IPv4/IPv6 addresses or CIDR ranges');
        }
        return { valid: errors.length === 0, errors, sanitized: value?.trim() };
    }
    // Rate limiting helper
    static commandCounts = new Map();
    static checkRateLimit(identifier, maxRequests = 100, windowMs = 60000) {
        const now = Date.now();
        const existing = this.commandCounts.get(identifier);
        if (!existing || now > existing.resetTime) {
            this.commandCounts.set(identifier, { count: 1, resetTime: now + windowMs });
            return true;
        }
        if (existing.count >= maxRequests) {
            return false;
        }
        existing.count++;
        return true;
    }
}
//# sourceMappingURL=validator.js.map