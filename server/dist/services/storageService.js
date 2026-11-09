"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storageService = exports.StorageService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const uuid_1 = require("uuid");
const models_1 = require("../models");
const config_1 = require("../config");
const mongoConnection_1 = require("../data/mongoConnection");
const ALLOWED_MIME_TYPES = {
    COURSE_MATERIAL: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip',
        'text/plain',
    ],
    IMAGE: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/svg+xml',
        'image/gif',
    ],
    VIDEO_SOURCE: [
        'video/mp4',
        'video/quicktime',
        'video/webm',
        'video/x-matroska',
    ],
    TRANSCODED_HLS: [
        'application/vnd.apple.mpegurl',
        'application/x-mpegurl',
        'video/mp2t',
    ],
    VERIFICATION_DOC: [
        'application/pdf',
        'image/jpeg',
        'image/png',
    ],
};
const MAX_FILE_SIZE_BYTES = {
    IMAGE: 10 * 1024 * 1024, // 10 MB
    VERIFICATION_DOC: 25 * 1024 * 1024, // 25 MB
    COURSE_MATERIAL: 50 * 1024 * 1024, // 50 MB
    TRANSCODED_HLS: 100 * 1024 * 1024, // 100 MB per segment
    VIDEO_SOURCE: 1024 * 1024 * 1024, // 1 GB
};
class StorageService {
    config;
    inMemoryAssets = new Map();
    constructor() {
        this.config = {
            endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT || 'https://cloudflare-r2.edusphere.io',
            accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '',
            bucketName: process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'edusphere-media-production',
            region: process.env.S3_REGION || 'auto',
            publicDomain: process.env.R2_PUBLIC_DOMAIN || process.env.S3_PUBLIC_DOMAIN,
        };
    }
    isConfigured() {
        return Boolean(this.config.endpoint &&
            this.config.accessKeyId &&
            this.config.secretAccessKey &&
            this.config.bucketName);
    }
    getTelemetry() {
        const configured = this.isConfigured();
        return {
            configured,
            provider: 'Cloudflare R2 (S3-Compatible Object Storage)',
            bucket: this.config.bucketName,
            region: this.config.region,
            endpointConfigured: Boolean(this.config.endpoint),
            status: configured ? 'ONLINE' : (config_1.config.isProduction ? 'DEGRADED' : 'STANDALONE_SIMULATED'),
        };
    }
    /**
     * Generates AWS SigV4 Presigned URL for Upload (PUT)
     */
    async getPresignedUploadUrl(options) {
        const { fileName, fileType, fileSize, category, tenantId, ownerId, isPublic = false } = options;
        // 1. Validate File Category & MIME Type
        const allowedTypes = ALLOWED_MIME_TYPES[category];
        if (!allowedTypes || !allowedTypes.includes(fileType.toLowerCase())) {
            throw new Error(`Forbidden file type '${fileType}' for category '${category}'. Permitted types: ${allowedTypes.join(', ')}`);
        }
        // 2. Validate File Size
        const maxSize = MAX_FILE_SIZE_BYTES[category];
        if (fileSize > maxSize) {
            throw new Error(`File size ${Math.round(fileSize / (1024 * 1024))}MB exceeds maximum allowable limit of ${Math.round(maxSize / (1024 * 1024))}MB for category '${category}'.`);
        }
        // 3. Prevent executable extensions
        const ext = fileName.split('.').pop()?.toLowerCase() || '';
        const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'jar', 'vbs', 'scr', 'msi', 'com'];
        if (dangerousExtensions.includes(ext)) {
            throw new Error(`Security Violation: Uploading executable file type '.${ext}' is prohibited.`);
        }
        // 4. Construct Tenant-Scoped S3/R2 Object Key
        const assetId = `asset-${(0, uuid_1.v4)().slice(0, 12)}`;
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const tenantPrefix = tenantId ? `tenants/${tenantId}` : 'global';
        const key = `${tenantPrefix}/${category.toLowerCase()}/${ownerId}/${assetId}-${sanitizedFileName}`;
        // 5. Generate SigV4 Presigned Upload URL (15 minutes expiry)
        const expiresInSeconds = 900;
        const uploadUrl = this.generateSigV4Url('PUT', key, expiresInSeconds, {
            'content-type': fileType,
        });
        // 6. Record Asset in Database & Memory (Dual-Mode)
        const assetRecord = {
            id: assetId,
            key,
            bucket: this.config.bucketName,
            fileName: sanitizedFileName,
            fileType,
            fileSize,
            tenantId: tenantId || null,
            ownerId,
            category,
            isPublic,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
        };
        this.inMemoryAssets.set(assetId, assetRecord);
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                await models_1.FileAssetModel.create(assetRecord);
            }
            catch (err) {
                console.warn('[StorageService] Asset metadata persistence warning:', err?.message || err);
            }
        }
        const publicUrl = isPublic
            ? (this.config.publicDomain
                ? `${this.config.publicDomain.replace(/\/+$/, '')}/${key}`
                : `${this.config.endpoint.replace(/\/+$/, '')}/${this.config.bucketName}/${key}`)
            : undefined;
        return {
            assetId,
            key,
            uploadUrl,
            method: 'PUT',
            headers: {
                'Content-Type': fileType,
            },
            expiresInSeconds,
            publicUrl,
        };
    }
    /**
     * Confirms upload completion and activates file asset
     */
    async confirmUpload(assetId, ownerId) {
        let asset = null;
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                asset = await models_1.FileAssetModel.findOne({ id: assetId });
            }
            catch { }
        }
        if (!asset) {
            asset = this.inMemoryAssets.get(assetId);
        }
        if (!asset) {
            throw new Error(`File asset '${assetId}' not found`);
        }
        if (asset.ownerId !== ownerId) {
            throw new Error('Forbidden: Only the asset owner can confirm upload completion');
        }
        asset.status = 'READY';
        if (mongoConnection_1.connectionState.isConnected && typeof asset.save === 'function') {
            await asset.save();
        }
        return asset;
    }
    /**
     * Generates secure Presigned Download URL with Tenant Isolation Barrier
     */
    async getPresignedDownloadUrl(options) {
        const { assetId, requestingTenantId, requestingUserId, requestingUserRole } = options;
        let asset = null;
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                asset = await models_1.FileAssetModel.findOne({ id: assetId });
            }
            catch { }
        }
        if (!asset) {
            asset = this.inMemoryAssets.get(assetId);
        }
        if (!asset) {
            throw new Error(`File asset '${assetId}' not found`);
        }
        if (asset.status === 'DELETED') {
            throw new Error('Requested file asset has been deleted');
        }
        // Access Control Barrier:
        // 1. Public files are accessible to all
        // 2. Platform Admins have global audit access
        // 3. Owner has access
        // 4. Same tenant users have access; different tenant users are BLOCKED
        const isOwner = asset.ownerId === requestingUserId;
        const isPlatformAdmin = requestingUserRole === 'PLATFORM_ADMIN' || requestingUserRole === 'PLATFORM_SUPERADMIN';
        const isSameTenant = asset.tenantId === requestingTenantId;
        if (!asset.isPublic && !isPlatformAdmin && !isOwner && !isSameTenant) {
            throw new Error(`Forbidden: Cross-tenant file access blocked. Asset belongs to tenant '${asset.tenantId || 'global'}'`);
        }
        const expiresInSeconds = 3600; // 1 hour
        const downloadUrl = this.generateSigV4Url('GET', asset.key, expiresInSeconds);
        return {
            downloadUrl,
            expiresInSeconds,
            fileName: asset.fileName,
        };
    }
    /**
     * Deletes object from R2 and marks asset as DELETED
     */
    async deleteAsset(assetId, requestingTenantId, requestingUserId, requestingUserRole) {
        let asset = null;
        if (mongoConnection_1.connectionState.isConnected) {
            try {
                asset = await models_1.FileAssetModel.findOne({ id: assetId });
            }
            catch { }
        }
        if (!asset) {
            asset = this.inMemoryAssets.get(assetId);
        }
        if (!asset)
            return false;
        const isOwner = asset.ownerId === requestingUserId;
        const isPlatformAdmin = requestingUserRole === 'PLATFORM_ADMIN' || requestingUserRole === 'PLATFORM_SUPERADMIN';
        const isInstitutionAdmin = requestingUserRole === 'INSTITUTION_ADMIN' && asset.tenantId === requestingTenantId;
        if (!isOwner && !isPlatformAdmin && !isInstitutionAdmin) {
            throw new Error('Forbidden: Insufficient privileges to delete this file asset');
        }
        asset.status = 'DELETED';
        if (mongoConnection_1.connectionState.isConnected && typeof asset.save === 'function') {
            await asset.save();
        }
        // If R2 credentials are fully configured, dispatch remote S3 DELETE request
        if (this.isConfigured()) {
            try {
                const deleteUrl = this.generateSigV4Url('DELETE', asset.key, 300);
                await fetch(deleteUrl, { method: 'DELETE' });
            }
            catch (err) {
                console.error('[StorageService] Remote deletion failed:', err?.message);
            }
        }
        return true;
    }
    /**
     * Helper: uploads buffer directly (used by worker for HLS master manifest and video segments)
     */
    async uploadBuffer(key, buffer, contentType) {
        if (!this.isConfigured()) {
            return `https://mock-r2.edusphere.io/${this.config.bucketName}/${key}`;
        }
        const putUrl = this.generateSigV4Url('PUT', key, 600, { 'content-type': contentType });
        const res = await fetch(putUrl, {
            method: 'PUT',
            headers: { 'Content-Type': contentType },
            body: new Uint8Array(buffer),
        });
        if (!res.ok) {
            throw new Error(`Failed to upload object to R2: HTTP ${res.status} ${res.statusText}`);
        }
        return this.config.publicDomain
            ? `${this.config.publicDomain.replace(/\/+$/, '')}/${key}`
            : `${this.config.endpoint.replace(/\/+$/, '')}/${this.config.bucketName}/${key}`;
    }
    /**
     * Cryptographic AWS Signature Version 4 (SigV4) Presigned URL Generator
     * Pure Node.js built-in crypto implementation - ZERO external packages required!
     */
    generateSigV4Url(method, objectKey, expiresInSeconds = 900, headersToSign = {}) {
        const rawEndpoint = this.config.endpoint.replace(/\/+$/, '');
        const cleanKey = objectKey.replace(/^\/+/, '');
        const urlObj = new URL(rawEndpoint);
        const host = urlObj.host;
        // Path Style vs Virtual Hosted Style: R2 standard format is /bucket/key
        const canonicalUri = `/${this.config.bucketName}/${cleanKey}`;
        const date = new Date();
        const amzDate = date.toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
        const dateStamp = amzDate.slice(0, 8); // YYYYMMDD
        const region = this.config.region || 'auto';
        const service = 's3';
        const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
        const accessKey = this.config.accessKeyId || 'DEV_R2_KEY_DUMMY';
        const secretKey = this.config.secretAccessKey || 'DEV_R2_SECRET_KEY_DUMMY';
        const queryParams = {
            'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
            'X-Amz-Credential': `${accessKey}/${credentialScope}`,
            'X-Amz-Date': amzDate,
            'X-Amz-Expires': expiresInSeconds.toString(),
            'X-Amz-SignedHeaders': 'host',
        };
        // Sort query parameters
        const canonicalQueryString = Object.keys(queryParams)
            .sort()
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(queryParams[k])}`)
            .join('&');
        const canonicalHeaders = `host:${host}\n`;
        const signedHeaders = 'host';
        const payloadHash = 'UNSIGNED-PAYLOAD';
        const canonicalRequest = [
            method,
            canonicalUri,
            canonicalQueryString,
            canonicalHeaders,
            signedHeaders,
            payloadHash,
        ].join('\n');
        const stringToSign = [
            'AWS4-HMAC-SHA256',
            amzDate,
            credentialScope,
            crypto_1.default.createHash('sha256').update(canonicalRequest).digest('hex'),
        ].join('\n');
        // Derive Signing Key
        const kDate = crypto_1.default.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
        const kRegion = crypto_1.default.createHmac('sha256', kDate).update(region).digest();
        const kService = crypto_1.default.createHmac('sha256', kRegion).update(service).digest();
        const kSigning = crypto_1.default.createHmac('sha256', kService).update('aws4_request').digest();
        const signature = crypto_1.default.createHmac('sha256', kSigning).update(stringToSign).digest('hex');
        return `${rawEndpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
    }
}
exports.StorageService = StorageService;
exports.storageService = new StorageService();
