import { Request, Response, NextFunction } from 'express';

/**
 * Deep NoSQL Injection Sanitizer
 * Recursively scans and purges keys containing prohibited Mongo query operators
 * (keys starting with '$' or containing '.') from request bodies, queries, and params.
 */
export function sanitizeMongoInput<T>(target: T): T {
  if (!target || typeof target !== 'object') {
    return target;
  }

  if (Array.isArray(target)) {
    return target.map(sanitizeMongoInput) as unknown as T;
  }

  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(target)) {
    if (
      key.startsWith('$') ||
      key.includes('.') ||
      key === '__proto__' ||
      key === 'prototype' ||
      key === 'constructor'
    ) {
      continue;
    }
    clean[key] = sanitizeMongoInput(value);
  }

  return clean as T;
}

function containsUnsafeMongoKey(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsUnsafeMongoKey);

  return Object.entries(value).some(([key, child]) =>
    key.startsWith('$') ||
    key.includes('.') ||
    key === '__proto__' ||
    key === 'prototype' ||
    key === 'constructor' ||
    containsUnsafeMongoKey(child)
  );
}

export function mongoSanitize(req: Request, res: Response, next: NextFunction): void {
  if ([req.body, req.query, req.params].some(containsUnsafeMongoKey)) {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'MongoDB operators and unsafe object keys are not allowed',
    });
    return;
  }

  req.body = sanitizeMongoInput(req.body);
  Object.defineProperty(req, 'query', {
    configurable: true,
    enumerable: true,
    value: sanitizeMongoInput(req.query),
  });
  req.params = sanitizeMongoInput(req.params);
  next();
}
