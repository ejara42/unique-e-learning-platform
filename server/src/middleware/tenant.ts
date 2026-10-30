import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

export interface TenantContext {
  tenantId?: string | null;
  tenantSlug?: string | null;
}

export const tenantStorage = new AsyncLocalStorage<TenantContext>();

export function getTenantContext(): TenantContext {
  return tenantStorage.getStore() || { tenantId: null, tenantSlug: null };
}

export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Extract tenant from header or host subdomain
  const headerTenantId = req.headers['x-tenant-id'] as string;
  const host = req.headers.host || '';
  const subdomain = host.split('.')[0];

  const tenantSlug = subdomain && subdomain !== 'localhost' && subdomain !== 'www' ? subdomain : null;
  const tenantId = headerTenantId || null;

  const context: TenantContext = {
    tenantId,
    tenantSlug,
  };

  tenantStorage.run(context, () => {
    // Attach to request for convenience
    (req as any).tenant = context;
    next();
  });
}
