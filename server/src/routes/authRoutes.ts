import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { repo } from '../data/dbRepository';
import { config } from '../config';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { UserRole } from '../types';
import { SecurityTokenModel, UserModel } from '../models';
import { emailService } from '../services/emailService';

const router = Router();

// POST /api/auth/login - Production User Authentication
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await repo.getUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: 'Invalid credentials. User not found.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials. Incorrect password.' });
      return;
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      globalRole: user.globalRole,
      activeRole: user.activeRole,
      authorizedRoles: user.authorizedRoles || [user.activeRole],
      institutionId: user.institutionId,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        activeRole: user.activeRole,
        authorizedRoles: user.authorizedRoles || [user.activeRole],
        institutionId: user.institutionId,
        bio: user.bio,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

// POST /api/auth/register - Self-service User Registration (Learners, Instructors)
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, role } = req.body;

    if (!fullName || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    // Disallow registering directly as privileged roles via public registration endpoint!
    if (role === 'PLATFORM_ADMIN' || role === 'INSTITUTION_ADMIN') {
      res.status(403).json({ message: 'Privileged administrator accounts cannot be self-registered.' });
      return;
    }

    const existing = await repo.getUserByEmail(email);
    if (existing) {
      res.status(409).json({ message: 'An account with this email already exists' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters in length' });
      return;
    }

    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(password, salt);
    const newUserRole: UserRole = role === 'INSTRUCTOR' ? 'INSTRUCTOR' : 'STUDENT';
    const authorizedRoles: UserRole[] = newUserRole === 'INSTRUCTOR' ? ['INSTRUCTOR', 'STUDENT'] : ['STUDENT'];

    const newUser = {
      id: `user-${uuidv4().slice(0, 8)}`,
      email: email.toLowerCase().trim(),
      passwordHash,
      fullName: fullName.trim(),
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`,
      globalRole: 'STANDARD_USER' as const,
      activeRole: newUserRole,
      authorizedRoles,
      institutionId: null,
      security: { isEmailVerified: true, twoFactorEnabled: false },
      createdAt: new Date().toISOString(),
    };

    await repo.createUser(newUser);

    const tokenPayload = {
      id: newUser.id,
      email: newUser.email,
      fullName: newUser.fullName,
      globalRole: newUser.globalRole,
      activeRole: newUser.activeRole,
      authorizedRoles: newUser.authorizedRoles,
      institutionId: newUser.institutionId,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        avatarUrl: newUser.avatarUrl,
        activeRole: newUser.activeRole,
        authorizedRoles: newUser.authorizedRoles,
        institutionId: newUser.institutionId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// GET /api/auth/me - Authenticated User Profile
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await repo.getUserById(req.user?.id || '');
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        activeRole: user.activeRole,
        authorizedRoles: user.authorizedRoles || [user.activeRole],
        institutionId: user.institutionId,
        bio: user.bio,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Error retrieving profile', error: err.message });
  }
});

// POST /api/auth/switch-role - Secure Role Switching with Authorization Verification
router.post('/switch-role', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { newRole } = req.body;
    const user = await repo.getUserById(req.user?.id || '');

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const validRoles: UserRole[] = ['PLATFORM_ADMIN', 'INSTITUTION_ADMIN', 'INSTRUCTOR', 'STUDENT', 'INDEPENDENT_LEARNER'];
    if (!validRoles.includes(newRole)) {
      res.status(400).json({ message: `Invalid role specified: ${newRole}` });
      return;
    }

    // Role Escalation Barrier 1: Assuming Platform Admin requires global superadmin role
    if (newRole === 'PLATFORM_ADMIN' && user.globalRole !== 'PLATFORM_SUPERADMIN') {
      res.status(403).json({ message: 'Forbidden: Insufficient privileges to assume Platform Administrator role.' });
      return;
    }

    // Role Escalation Barrier 2: Assuming Institution Admin requires explicitly verified authorizedRole and valid institution
    if (newRole === 'INSTITUTION_ADMIN') {
      const isSuperAdmin = user.globalRole === 'PLATFORM_SUPERADMIN';
      const hasAuthorizedRole = user.authorizedRoles?.includes('INSTITUTION_ADMIN');
      if (!isSuperAdmin && (!hasAuthorizedRole || !user.institutionId)) {
        res.status(403).json({ message: 'Forbidden: You do not have verified institutional administrator authorization.' });
        return;
      }
    }

    // Role Escalation Barrier 3: Standard role assumption must be within user's persisted authorized roles
    if (user.globalRole !== 'PLATFORM_SUPERADMIN') {
      const allowedRoles = user.authorizedRoles || [user.activeRole];
      if (!allowedRoles.includes(newRole)) {
        res.status(403).json({ message: `Forbidden: Role '${newRole}' is not authorized for this account.` });
        return;
      }
    }

    const updatedUser = await repo.updateUserRole(user.id, newRole);
    if (!updatedUser) {
      res.status(500).json({ message: 'Failed to update user role' });
      return;
    }

    const tokenPayload = {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.fullName,
      globalRole: updatedUser.globalRole,
      activeRole: updatedUser.activeRole,
      authorizedRoles: updatedUser.authorizedRoles || [updatedUser.activeRole],
      institutionId: updatedUser.institutionId,
    };

    const token = jwt.sign(tokenPayload, config.jwtSecret, { expiresIn: '7d' });

    res.json({
      message: `Active role switched to ${newRole}`,
      token,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl,
        activeRole: updatedUser.activeRole,
        authorizedRoles: updatedUser.authorizedRoles || [updatedUser.activeRole],
        institutionId: updatedUser.institutionId,
      },
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to switch role', error: err.message });
  }
});

// POST /api/auth/forgot-password - Secure Password Reset Dispatch
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ message: 'A valid email address is required.' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await repo.getUserByEmail(normalizedEmail);

    if (user) {
      try {
        // Generate cryptographically secure single-use token (32 bytes)
        const { rawToken } = emailService.generateToken();
        await emailService.createSecurityToken(user.id, rawToken, 'PASSWORD_RESET', 60 * 60 * 1000); // 1 hour TTL

        // Dispatch transactional email (logs in dev, calls Resend API in prod)
        await emailService.sendPasswordResetEmail(user.email, user.fullName, rawToken);
      } catch (sendErr: any) {
        console.error('[Auth] forgot-password email dispatch failed:', sendErr?.message || sendErr);
      }
    }

    // Always respond with 200 OK to prevent user enumeration
    res.status(200).json({
      message: 'If an account exists for this email, password reset instructions have been dispatched.',
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to process password reset request', error: err.message });
  }
});

// POST /api/auth/reset-password - Execute Password Reset with Single-Use Verification
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required.' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ message: 'Password must be at least 8 characters in length.' });
      return;
    }

    // Verify and consume token in a single atomic-safe operation
    const consumeResult = await emailService.consumeSecurityToken(token, 'PASSWORD_RESET');
    if (!consumeResult.consumed || !consumeResult.userId) {
      res.status(400).json({
        message: 'Invalid, expired, or already used password reset token. Please request a new link.',
      });
      return;
    }

    // Hash the new password with bcrypt cost 12
    const salt = bcrypt.genSaltSync(12);
    const passwordHash = bcrypt.hashSync(newPassword, salt);

    // Update user password in database
    const user = await repo.getUserById(consumeResult.userId);
    if (!user) {
      res.status(404).json({ message: 'Associated user account no longer exists.' });
      return;
    }

    // Update in MongoDB
    if (repo.isMongoActive()) {
      await UserModel.findOneAndUpdate({ id: user.id }, { $set: { passwordHash } });
    }
    user.passwordHash = passwordHash;

    // Dispatch security alert without blocking the password reset flow.
    try {
      await emailService.sendSecurityAlert(
        user.email,
        user.fullName,
        'Your EduSphere password was successfully reset.'
      );
    } catch (alertErr: any) {
      console.error('[Auth] password reset security alert failed:', alertErr?.message || alertErr);
    }

    res.status(200).json({
      message: 'Password successfully reset. You may now log in with your new credentials.',
    });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to reset password', error: err.message });
  }
});

// POST /api/auth/verify-email - Single-Use Email Verification
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ message: 'Verification token is required.' });
      return;
    }

    const consumeResult = await emailService.consumeSecurityToken(token, 'EMAIL_VERIFICATION');
    if (!consumeResult.consumed || !consumeResult.userId) {
      res.status(400).json({ message: 'Invalid, expired, or already used verification token.' });
      return;
    }

    // Mark email verified on user
    if (repo.isMongoActive()) {
      await UserModel.findOneAndUpdate(
        { id: consumeResult.userId },
        { $set: { 'security.isEmailVerified': true } }
      );
    }

    res.status(200).json({ message: 'Email address verified successfully.' });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to verify email', error: err.message });
  }
});

export default router;
