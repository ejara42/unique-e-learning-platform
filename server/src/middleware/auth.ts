import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UserRole, GlobalRole } from '../types';
import { repo } from '../data/dbRepository';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  activeRole: UserRole;
  globalRole?: GlobalRole;
  authorizedRoles?: UserRole[];
  institutionId?: string | null;
  tokenVersion?: number;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: Missing or invalid Authorization header. Bearer token required.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    res.status(401).json({ message: 'Unauthorized: Missing Bearer token' });
    return;
  }

  let decoded: AuthenticatedUser;
  try {
    decoded = jwt.verify(token, config.jwtSecret) as AuthenticatedUser;
  } catch {
    res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
    return;
  }

  try {
    const tokenVersion = await repo.getUserTokenVersion(decoded.id);
    if (tokenVersion === null || (decoded.tokenVersion ?? 0) !== tokenVersion) {
      res.status(401).json({ message: 'Unauthorized: Session is no longer valid' });
      return;
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[Auth] failed to verify persisted session version:', err);
    res.status(503).json({ message: 'Authentication service is temporarily unavailable' });
  }
}

export async function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    next();
    return;
  }
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Unauthorized: Invalid token format' });
    return;
  }

  let decoded: AuthenticatedUser;
  try {
    decoded = jwt.verify(authHeader.slice(7), config.jwtSecret) as AuthenticatedUser;
  } catch {
    res.status(401).json({ message: 'Unauthorized: Token expired or invalid' });
    return;
  }

  try {
    const tokenVersion = await repo.getUserTokenVersion(decoded.id);
    if (tokenVersion === null || (decoded.tokenVersion ?? 0) !== tokenVersion) {
      res.status(401).json({ message: 'Unauthorized: Session is no longer valid' });
      return;
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error('[Auth] failed to verify persisted optional session version:', err);
    res.status(503).json({ message: 'Authentication service is temporarily unavailable' });
  }
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized: Authentication required' });
      return;
    }

    // Role Barrier 1: Assuming PLATFORM_ADMIN privileges requires globalRole === 'PLATFORM_SUPERADMIN'
    if (req.user.activeRole === 'PLATFORM_ADMIN') {
      if (req.user.globalRole !== 'PLATFORM_SUPERADMIN') {
        res.status(403).json({
          message: 'Forbidden: PLATFORM_ADMIN role assertion requires verified PLATFORM_SUPERADMIN global authority.',
        });
        return;
      }
      next();
      return;
    }

    // Role Barrier 2: Assuming INSTITUTION_ADMIN privileges requires institutional affiliation
    if (req.user.activeRole === 'INSTITUTION_ADMIN') {
      const isSuperAdmin = req.user.globalRole === 'PLATFORM_SUPERADMIN';
      const isAuthorized = req.user.authorizedRoles?.includes('INSTITUTION_ADMIN');
      if (!isSuperAdmin && (!isAuthorized || !req.user.institutionId)) {
        res.status(403).json({
          message: 'Forbidden: Active role INSTITUTION_ADMIN requires verified institutional affiliation.',
        });
        return;
      }
    }

    if (!allowedRoles.includes(req.user.activeRole)) {
      res.status(403).json({
        message: `Forbidden: Active role '${req.user.activeRole}' is not authorized for this resource`,
      });
      return;
    }

    next();
  };
}
