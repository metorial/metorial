export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  region: 'us' | 'eu' | 'ap';
}

export interface CloudinaryResource {
  assetId: string;
  publicId: string;
  format: string;
  version: number;
  resourceType: string;
  type: string;
  createdAt: string;
  bytes: number;
  width?: number;
  height?: number;
  folder: string;
  assetFolder?: string;
  displayName?: string;
  url: string;
  secureUrl: string;
  tags?: string[];
  context?: Record<string, string>;
  metadata?: Record<string, any>;
  accessMode?: string;
}

export interface CloudinaryUploadResponse {
  assetId: string;
  publicId: string;
  version: number;
  versionId: string;
  signature: string;
  width?: number;
  height?: number;
  format: string;
  resourceType: string;
  createdAt: string;
  tags: string[];
  bytes: number;
  type: string;
  url: string;
  secureUrl: string;
  folder: string;
  assetFolder?: string;
  displayName?: string;
  originalFilename?: string;
}

export interface CloudinarySearchResult {
  totalCount: number;
  time: number;
  nextCursor?: string;
  resources: CloudinaryResource[];
}

export interface CloudinaryListResult {
  resources: CloudinaryResource[];
  nextCursor?: string;
  rate_limit_allowed?: number;
  rate_limit_remaining?: number;
  rate_limit_reset_at?: string;
}

export interface CloudinaryFolder {
  name: string;
  path: string;
  externalId?: string;
}

export interface CloudinaryFolderListResult {
  folders: CloudinaryFolder[];
  nextCursor?: string;
  totalCount?: number;
}

export interface CloudinaryTrigger {
  triggerId: string;
  notificationUrl: string;
  eventType: string;
}
