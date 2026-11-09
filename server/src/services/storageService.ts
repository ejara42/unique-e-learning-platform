import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { FileAssetModel, IFileAssetDocument } from '../models';
import { connectionState } from '../data/mongoConnection';

export type FileCategory = 'COURSE_MATERIAL' | 'IMAGE' | 'VIDEO_SOURCE' | 'TRANSCODED_HLS' | 'VERIFICATION_DOC';

export interface StorageConfig {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  region: string;
  publicDomain?: string;
}

export interface PresignedUploadOptions {
  fileName: string;
  fileType: string;
  fileSize: number;
  category: FileCategory;
  tenantId?: string | null;
  ownerId: string;
  isPublic?: boolean;
}

export interface PresignedUploadResult {
  assetId: string;
  key: string;
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
  publicUrl?: string;
}

export interface PresignedDownloadOptions {
  assetId: string;
  requestingTenantId?: string | null;
  requestingUserId: string;
  requestingUserRole: string;
}

const ALLOWED_MIME_TYPES: Record<FileCategory, string[]> = {
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

const MAX_FILE_SIZE_BYTES: Record<FileCategory, number> = {
  IMAGE: 10 * 1024 * 1024, // 10 MB
  VERIFICATION_DOC: 25 * 1024 * 1024, // 25 MB
  COURSE_MATERIAL: 50 * 1024 * 1024, // 50 MB
  TRANSCODED_HLS: 100 * 1024 * 1024, // 100 MB per segment
  VIDEO_SOURCE: 1024 * 1024 * 1024, // 1 GB
};

export class StorageService {
  private config: StorageConfig;

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

  public isConfigured(): boolean {
    return Boolean(
      this.config.endpoint &&
      this.config.accessKeyId &&
      this.config.secretAccessKey &&
      this.config.bucketName
    );
  }

  public getTelemetry() {
    const configured = this.isConfigured();
    return {
      configured,
      provider: 'Cloudflare R2 (S3-Compatible Object Storage)',
      bucket: this.config.bucketName,
      region: this.config.region,
      endpointConfigured: Boolean(this.config.endpoint),
      status: configured ? 'ONLINE' : 'DEGRADED',
    };
  }

  /**
   * Generates AWS SigV4 Presigned URL for Upload (PUT)
   */
  async getPresignedUploadUrl(options: PresignedUploadOptions): Promise<PresignedUploadResult> {
    const { fileName, fileType, fileSize, category, tenantId, ownerId, isPublic = false } = options;

    // 1. Validate File Category & MIME Type
    const allowedTypes = ALLOWED_MIME_TYPES[category];
    if (!allowedTypes || !allowedTypes.includes(fileType.toLowerCase())) {
      throw new Error(`Forbidden file type '${fileType}' for category '${category}'. Permitted types: ${allowedTypes.join(', ')}`);
    }

    // 2. Validate File Size
    const maxSize = MAX_FILE_SIZE_BYTES[category];
    if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > maxSize) {
      throw new Error(`File size ${Math.round(fileSize / (1024 * 1024))}MB exceeds maximum allowable limit of ${Math.round(maxSize / (1024 * 1024))}MB for category '${category}'.`);
    }

    // 3. Prevent executable extensions
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const dangerousExtensions = ['exe', 'bat', 'cmd', 'sh', 'php', 'js', 'jar', 'vbs', 'scr', 'msi', 'com'];
    if (dangerousExtensions.includes(ext)) {
      throw new Error(`Security Violation: Uploading executable file type '.${ext}' is prohibited.`);
    }

    if (!this.isConfigured()) {
      throw new Error('Object storage is not configured; upload URL generation is unavailable.');
    }
    if (!connectionState.isConnected) {
      throw new Error('MongoDB is required to persist uploaded file metadata.');
    }

    // 4. Construct Tenant-Scoped S3/R2 Object Key
    const assetId = `asset-${uuidv4().slice(0, 12)}`;
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tenantPrefix = tenantId ? `tenants/${tenantId}` : 'global';
    const key = `${tenantPrefix}/${category.toLowerCase()}/${ownerId}/${assetId}-${sanitizedFileName}`;

    // 5. Generate SigV4 Presigned Upload URL (15 minutes expiry)
    const expiresInSeconds = 900;
    const uploadUrl = this.generateSigV4Url('PUT', key, expiresInSeconds, {
      'content-type': fileType,
    });

    // 6. Persist the asset record before returning a URL.
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
    await FileAssetModel.create(assetRecord);

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
  async confirmUpload(assetId: string, ownerId: string): Promise<any> {
    if (!connectionState.isConnected) {
      throw new Error('MongoDB is required to confirm uploaded file metadata.');
    }
    const asset: any = await FileAssetModel.findOne({ id: assetId });
    if (!asset) {
      throw new Error(`File asset '${assetId}' not found`);
    }
    if (asset.ownerId !== ownerId) {
      throw new Error('Forbidden: Only the asset owner can confirm upload completion');
    }

    const headUrl = this.generateSigV4Url('HEAD', asset.key, 300);
    const objectResponse = await fetch(headUrl, { method: 'HEAD' });
    if (!objectResponse.ok) {
      throw new Error(`Uploaded object verification failed with HTTP ${objectResponse.status}`);
    }
    const actualSize = Number(objectResponse.headers.get('content-length'));
    if (!Number.isSafeInteger(actualSize) || actualSize !== asset.fileSize) {
      throw new Error('Uploaded object size does not match the declared file size.');
    }

    asset.status = 'READY';
    await asset.save();
    return asset;
  }

  /**
   * Generates secure Presigned Download URL with Tenant Isolation Barrier
   */
  async getPresignedDownloadUrl(options: PresignedDownloadOptions): Promise<{ downloadUrl: string; expiresInSeconds: number; fileName: string }> {
    const { assetId, requestingTenantId, requestingUserId, requestingUserRole } = options;

    if (!connectionState.isConnected) {
      throw new Error('MongoDB is required to authorize file downloads.');
    }
    const asset: any = await FileAssetModel.findOne({ id: assetId });
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
    const isSameTenant = Boolean(
      asset.tenantId &&
      requestingTenantId &&
      asset.tenantId === requestingTenantId
    );

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
  async deleteAsset(assetId: string, requestingTenantId?: string | null, requestingUserId?: string, requestingUserRole?: string): Promise<boolean> {
    if (!connectionState.isConnected) {
      throw new Error('MongoDB is required to authorize file deletion.');
    }
    const asset: any = await FileAssetModel.findOne({ id: assetId });
    if (!asset) return false;

    const isOwner = asset.ownerId === requestingUserId;
    const isPlatformAdmin = requestingUserRole === 'PLATFORM_ADMIN' || requestingUserRole === 'PLATFORM_SUPERADMIN';
    const isInstitutionAdmin = requestingUserRole === 'INSTITUTION_ADMIN' && asset.tenantId === requestingTenantId;

    if (!isOwner && !isPlatformAdmin && !isInstitutionAdmin) {
      throw new Error('Forbidden: Insufficient privileges to delete this file asset');
    }

    asset.status = 'DELETED';
    await asset.save();

    // If R2 credentials are fully configured, dispatch remote S3 DELETE request
    if (this.isConfigured()) {
      const deleteUrl = this.generateSigV4Url('DELETE', asset.key, 300);
      const response = await fetch(deleteUrl, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error(`Remote object deletion failed with HTTP ${response.status}`);
      }
    }

    return true;
  }

  /**
   * Helper: uploads buffer directly (used by worker for HLS master manifest and video segments)
   */
  async uploadBuffer(key: string, buffer: Buffer, contentType: string): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Object storage is not configured; buffer upload is unavailable.');
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
  public generateSigV4Url(
    method: 'GET' | 'PUT' | 'DELETE' | 'HEAD',
    objectKey: string,
    expiresInSeconds: number = 900,
    headersToSign: Record<string, string> = {}
  ): string {
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

    const accessKey = this.config.accessKeyId;
    const secretKey = this.config.secretAccessKey;
    if (!accessKey || !secretKey) {
      throw new Error('Object storage credentials are not configured.');
    }

    const queryParams: Record<string, string> = {
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
      crypto.createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    // Derive Signing Key
    const kDate = crypto.createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update(service).digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();

    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    return `${rawEndpoint}${canonicalUri}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
  }
}

export const storageService = new StorageService();
