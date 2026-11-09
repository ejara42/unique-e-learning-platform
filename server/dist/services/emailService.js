"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.TransactionalEmailService = exports.EmailServiceUnavailableError = void 0;
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const models_1 = require("../models");
const mongoConnection_1 = require("../data/mongoConnection");
class EmailServiceUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = 'EmailServiceUnavailableError';
    }
}
exports.EmailServiceUnavailableError = EmailServiceUnavailableError;
function escapeHtml(value) {
    return value.replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character] || character);
}
class TransactionalEmailService {
    apiKey;
    fromEmail;
    frontendUrl;
    dispatchedCount = 0;
    constructor() {
        this.apiKey = process.env.RESEND_API_KEY || '';
        this.fromEmail = process.env.EMAIL_FROM || 'EduSphere Platform <noreply@edusphere.io>';
        this.frontendUrl = process.env.FRONTEND_URL || 'https://unique-e-learning-platform.pages.dev';
    }
    isConfigured() {
        return Boolean(this.apiKey && this.apiKey.startsWith('re_'));
    }
    getTelemetry() {
        const configured = this.isConfigured();
        return {
            configured,
            provider: 'Resend Transactional Email Infrastructure',
            senderDomain: this.fromEmail,
            totalDispatched: this.dispatchedCount,
            status: configured ? 'ONLINE' : 'DEGRADED',
        };
    }
    /**
     * Cryptographically secure token generator:
     * Generates a random 32-byte hex token for the user, and an SHA-256 hash for database storage.
     * The raw token is NEVER stored in the database!
     */
    generateToken() {
        const rawToken = crypto_1.default.randomBytes(32).toString('hex');
        const tokenHash = crypto_1.default.createHash('sha256').update(rawToken).digest('hex');
        return { rawToken, tokenHash };
    }
    hashToken(rawToken) {
        return crypto_1.default.createHash('sha256').update(rawToken.trim()).digest('hex');
    }
    async createSecurityToken(userId, rawToken, type, expiresInMs) {
        const tokenHash = this.hashToken(rawToken);
        const expiresAt = new Date(Date.now() + expiresInMs);
        const id = `token-${(0, uuid_1.v4)().slice(0, 12)}`;
        const tokenDoc = {
            id,
            userId,
            tokenHash,
            type,
            expiresAt,
            isUsed: false,
            createdAt: new Date(),
        };
        if (!mongoConnection_1.connectionState.isConnected) {
            throw new EmailServiceUnavailableError('MongoDB is required to persist security tokens.');
        }
        await models_1.SecurityTokenModel.create(tokenDoc);
        return { id, tokenHash, expiresAt };
    }
    async verifySecurityToken(rawToken, type) {
        const tokenHash = this.hashToken(rawToken);
        const now = new Date();
        if (!mongoConnection_1.connectionState.isConnected) {
            throw new EmailServiceUnavailableError('MongoDB is required to verify security tokens.');
        }
        const tokenDoc = await models_1.SecurityTokenModel.findOne({
            tokenHash,
            type,
            isUsed: false,
            expiresAt: { $gt: now },
        });
        if (!tokenDoc || tokenDoc.type !== type) {
            return { valid: false, error: 'Token not found or invalid type.' };
        }
        return { valid: true, userId: tokenDoc.userId };
    }
    async consumeSecurityToken(rawToken, type) {
        if (!mongoConnection_1.connectionState.isConnected) {
            throw new EmailServiceUnavailableError('MongoDB is required to consume security tokens.');
        }
        const tokenHash = this.hashToken(rawToken);
        const tokenDoc = await models_1.SecurityTokenModel.findOneAndUpdate({ tokenHash, type, isUsed: false, expiresAt: { $gt: new Date() } }, { $set: { isUsed: true, usedAt: new Date() } }, { new: true });
        return tokenDoc
            ? { consumed: true, userId: tokenDoc.userId }
            : { consumed: false };
    }
    /**
     * Dispatches email via Resend REST API
     */
    async sendEmail(options) {
        const { to, subject, html, text } = options;
        if (!to || !to.includes('@')) {
            throw new Error(`Invalid destination email address: ${to}`);
        }
        if (!this.isConfigured()) {
            throw new EmailServiceUnavailableError('Transactional email delivery is unavailable: RESEND_API_KEY is not configured.');
        }
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: this.fromEmail,
                    to: [to],
                    subject,
                    html,
                    text: text || html.replace(/<[^>]+>/g, ' ').trim(),
                }),
                signal: controller.signal,
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(`Resend API rejected email (${response.status}): ${JSON.stringify(errorData)}`);
            }
            const data = (await response.json());
            this.dispatchedCount++;
            console.log(`[Email Dispatched] To: ${to} | Subject: "${subject}" | Provider ID: ${data.id}`);
            return { id: data.id, success: true };
        }
        catch (err) {
            if (err.name === 'AbortError') {
                throw new Error('Resend API request timed out after 8000ms');
            }
            console.error(`[Email Error] Failed to deliver email to ${to}:`, err.message);
            throw err;
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    /**
     * 1. Email Verification
     */
    async sendVerificationEmail(to, fullName, rawToken) {
        const verificationUrl = `${this.frontendUrl}/verify-email?token=${rawToken}`;
        const escapedName = escapeHtml(fullName);
        const subject = 'Verify your EduSphere Account';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #2563eb;">Welcome to EduSphere, ${escapedName}!</h2>
        <p>Please confirm your email address to activate your account and start learning.</p>
        <div style="margin: 28px 0;">
          <a href="${verificationUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b;">This verification link will expire in 24 hours. If you did not register for EduSphere, please disregard this message.</p>
      </div>
    `;
        return this.sendEmail({ to, subject, html });
    }
    /**
     * 2. Password Reset
     */
    async sendPasswordResetEmail(to, fullName, rawToken) {
        const resetUrl = `${this.frontendUrl}/reset-password?token=${rawToken}`;
        const escapedName = escapeHtml(fullName);
        const subject = 'EduSphere — Password Reset Request';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hello ${escapedName},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password:</p>
        <div style="margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="font-size: 13px; color: #64748b;">This link is single-use and will expire in 1 hour. If you did not request a password reset, your account remains secure and no action is required.</p>
      </div>
    `;
        return this.sendEmail({ to, subject, html });
    }
    /**
     * 3. Institution Approval / Rejection Notification
     */
    async sendInstitutionStatusNotification(to, institutionName, status, remarks) {
        const isApproved = status === 'VERIFIED';
        const subject = `EduSphere Institution Status: ${isApproved ? 'Approved & Verified' : 'Application Update'}`;
        const escapedInstitutionName = escapeHtml(institutionName);
        const escapedRemarks = remarks ? escapeHtml(remarks) : '';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: ${isApproved ? '#16a34a' : '#dc2626'};">${escapedInstitutionName}</h2>
        <p>Your institutional application on EduSphere has been updated to: <strong>${status}</strong>.</p>
        ${remarks ? `<p style="padding: 12px; background: #f1f5f9; border-left: 4px solid #94a3b8; font-style: italic;">Remarks: ${escapedRemarks}</p>` : ''}
        ${isApproved ? `<p>Your institution portal is now active. You may log in as Institution Administrator and onboard instructors and courses.</p>` : ''}
      </div>
    `;
        return this.sendEmail({ to, subject, html });
    }
    /**
     * 4. Course Enrollment Confirmation
     */
    async sendEnrollmentConfirmation(to, learnerName, courseTitle) {
        const subject = `Enrolled: ${courseTitle}`;
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #2563eb;">Enrollment Confirmed!</h2>
        <p>Hi ${learnerName},</p>
        <p>You have successfully enrolled in <strong>${courseTitle}</strong>.</p>
        <p>You can access your modules, lesson videos, and interactive quizzes anytime from your dashboard.</p>
      </div>
    `;
        return this.sendEmail({ to, subject, html });
    }
    /**
     * 5. Security Alert Notification
     */
    async sendSecurityAlert(to, fullName, alertDetails) {
        const subject = 'Security Alert: Account Activity';
        const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #dc2626;">Security Alert</h2>
        <p>Hello ${fullName},</p>
        <p>We detected important security activity on your account:</p>
        <p style="padding: 12px; background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; border-radius: 4px;">${alertDetails}</p>
        <p style="font-size: 13px; color: #64748b;">If this was you, you can safely disregard this email. If not, please change your password immediately.</p>
      </div>
    `;
        return this.sendEmail({ to, subject, html });
    }
}
exports.TransactionalEmailService = TransactionalEmailService;
exports.emailService = new TransactionalEmailService();
