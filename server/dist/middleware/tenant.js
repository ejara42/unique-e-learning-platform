"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantStorage = void 0;
exports.getTenantContext = getTenantContext;
exports.tenantMiddleware = tenantMiddleware;
const async_hooks_1 = require("async_hooks");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
exports.tenantStorage = new async_hooks_1.AsyncLocalStorage();
function getTenantContext() {
    return exports.tenantStorage.getStore() || { tenantId: null, tenantSlug: null };
}
function tenantMiddleware(req, res, next) {
    const headerTenantId = Array.isArray(req.headers['x-tenant-id'])
        ? req.headers['x-tenant-id'][0]
        : req.headers['x-tenant-id'];
    const host = req.headers.host || '';
    const subdomain = host.split('.')[0];
    const tenantSlug = subdomain && subdomain !== 'localhost' && subdomain !== 'www' ? subdomain : null;
    const context = {
        tenantId: null,
        tenantSlug,
    };
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice('Bearer '.length).trim();
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwtSecret);
            if (decoded.institutionId) {
                context.tenantId = decoded.institutionId;
            }
        }
        catch {
            // Ignore invalid tokens here; the route middleware will enforce auth separately.
        }
    }
    if (!context.tenantId && !config_1.config.isProduction) {
        context.tenantId = headerTenantId || null;
    }
    exports.tenantStorage.run(context, () => {
        req.tenant = context;
        next();
    });
}
