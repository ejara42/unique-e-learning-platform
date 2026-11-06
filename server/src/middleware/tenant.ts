import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface TenantContext {
  tenantId?: string | null;
  tenantSlug?: string | null;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  return tenantStorage.getStore() || { tenantId: null, tenantSlug: null };
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerTenantId = Array.isArray(req.headers['x-tenant-id'])
    ? req.headers['x-tenant-id'][0]
    : req.headers['x-tenant-id'];
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];
  const tenantSlug = subdomain && subdomain !== 'localhost' && subdomain !== 'www' ? subdomain : null;

  const context: TenantContext = {
    tenantId: null,
    tenantSlug,
  };

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice('Bearer '.length).trim();
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { institutionId?: string | null };
      if (decoded.institutionId) {
        context.tenantId = decoded.institutionId;
      }
    } catch {
      // Ignore invalid tokens here; the route middleware will enforce auth separately.
    }
  }

  if (!context.tenantId && !config.isProduction) {
    context.tenantId = headerTenantId || null;
  }

  tenantStorage.run(context, () => {
    (req as any).tenant = context;
    next();
  });
}
