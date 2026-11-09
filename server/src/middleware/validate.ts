import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

/**
 * Express Middleware factory for request payload validation with Zod.
 * Replaces `req.body` with parsed and strictly sanitized data, blocking unexpected fields.
 */
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues: any[] = (result.error as any).issues || (result.error as any).errors || [];
      const formattedErrors = issues.map((err: any) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : '',
        message: err.message,
      }));

      const primaryMessage = formattedErrors.length > 0
        ? formattedErrors[0].message
        : 'Invalid request payload';

      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: primaryMessage,
        details: formattedErrors,
      });
      return;
    }

    req.body = result.data;
    next();
  };
}

/**
 * Express Middleware factory for URL query parameter validation.
 */
export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const issues: any[] = (result.error as any).issues || (result.error as any).errors || [];
      const formattedErrors = issues.map((err: any) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : '',
        message: err.message,
      }));

      const primaryMessage = formattedErrors.length > 0
        ? formattedErrors[0].message
        : 'Invalid query parameters';

      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: primaryMessage,
        details: formattedErrors,
      });
      return;
    }

    req.query = result.data as any;
    next();
  };
}

/**
 * Express Middleware factory for route parameter validation.
 */
export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      const issues: any[] = (result.error as any).issues || (result.error as any).errors || [];
      const formattedErrors = issues.map((err: any) => ({
        field: Array.isArray(err.path) ? err.path.join('.') : '',
        message: err.message,
      }));

      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: formattedErrors[0]?.message || 'Invalid route parameters',
        details: formattedErrors,
      });
      return;
    }

    req.params = result.data as any;
    next();
  };
}
