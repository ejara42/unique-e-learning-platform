import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

export function validateRequest<T>(schema: ZodSchema<T>, part: RequestPart = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);

    if (!result.success) {
      const details = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: details[0]?.message || `Invalid request ${part}`,
        details,
      });
      return;
    }

    if (part === 'body') req.body = result.data;
    if (part === 'query') {
      Object.defineProperty(req, 'query', {
        configurable: true,
        enumerable: true,
        value: result.data,
      });
    }
    if (part === 'params') req.params = result.data as Request['params'];
    next();
  };
}

export const validateBody = <T>(schema: ZodSchema<T>) => validateRequest(schema, 'body');
export const validateQuery = <T>(schema: ZodSchema<T>) => validateRequest(schema, 'query');
export const validateParams = <T>(schema: ZodSchema<T>) => validateRequest(schema, 'params');
