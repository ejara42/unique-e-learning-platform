"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForbiddenError = exports.UnauthorizedError = exports.DatabaseUnavailableError = void 0;
class DatabaseUnavailableError extends Error {
    statusCode = 503;
    constructor(message = 'MongoDB persistence cluster is unavailable in production. Operation halted to prevent silent data loss.') {
        super(message);
        this.name = 'DatabaseUnavailableError';
        Object.setPrototypeOf(this, DatabaseUnavailableError.prototype);
    }
}
exports.DatabaseUnavailableError = DatabaseUnavailableError;
class UnauthorizedError extends Error {
    statusCode = 401;
    constructor(message = 'Unauthorized access.') {
        super(message);
        this.name = 'UnauthorizedError';
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends Error {
    statusCode = 403;
    constructor(message = 'Forbidden: Access denied across tenant boundaries or insufficient role.') {
        super(message);
        this.name = 'ForbiddenError';
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}
exports.ForbiddenError = ForbiddenError;
