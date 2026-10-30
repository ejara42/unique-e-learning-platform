export class DatabaseUnavailableError extends Error {
  public statusCode: number = 503;
  constructor(message: string = 'MongoDB persistence cluster is unavailable in production. Operation halted to prevent silent data loss.') {
    super(message);
    this.name = 'DatabaseUnavailableError';
    Object.setPrototypeOf(this, DatabaseUnavailableError.prototype);
  }
}

export class UnauthorizedError extends Error {
  public statusCode: number = 401;
  constructor(message: string = 'Unauthorized access.') {
    super(message);
    this.name = 'UnauthorizedError';
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export class ForbiddenError extends Error {
  public statusCode: number = 403;
  constructor(message: string = 'Forbidden: Access denied across tenant boundaries or insufficient role.') {
    super(message);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

