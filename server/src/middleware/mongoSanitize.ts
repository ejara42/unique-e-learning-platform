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
    // Prohibit keys starting with $ (e.g. $gt, $ne, $where, $regex) or containing . (path traversal)
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeMongoInput(value);
  }

  return clean as T;
}

export function mongoSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeMongoInput(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeMongoInput(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeMongoInput(req.params);
  }
  next();
}
