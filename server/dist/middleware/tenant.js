"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantStorage = void 0;
exports.getTenantContext = getTenantContext;
exports.tenantMiddleware = tenantMiddleware;
const async_hooks_1 = require("async_hooks");
exports.tenantStorage = new async_hooks_1.AsyncLocalStorage();
function getTenantContext() {
    return exports.tenantStorage.getStore() || { tenantId: null, tenantSlug: null };
}
function tenantMiddleware(req, res, next) {
    // Extract tenant from header or host subdomain
    const headerTenantId = req.headers['x-tenant-id'];
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    const tenantSlug = subdomain && subdomain !== 'localhost' && subdomain !== 'www' ? subdomain : null;
    const tenantId = headerTenantId || null;
    const context = {
        tenantId,
        tenantSlug,
    };
    exports.tenantStorage.run(context, () => {
        // Attach to request for convenience
        req.tenant = context;
        next();
    });
}
