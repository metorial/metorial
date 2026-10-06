import { z } from 'zod';
export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  region: 'us' | 'eu' | 'ap';
}
export const resourceSchema = z.object({
  assetId: z.string(),
  publicId: z.string(),
  format: z.string().optional(),
  version: z.number().optional(),
  resourceType: z.string().optional(),
  type: z.string().optional(),
  createdAt: z.string().optional(),
  bytes: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  folder: z.string().optional(),
  assetFolder: z.string().optional(),
  displayName: z.string().optional(),
  url: z.string().optional(),
  secureUrl: z.string().optional(),
  tags: z.array(z.string()).optional(),
  context: z.record(z.string(), z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  accessMode: z.string().optional(),
  originalFilename: z.string().optional(),
  moderation: z.array(z.object({ kind: z.string().optional(), status: z.string() })).optional()
});
export type CloudinaryResource = z.infer<typeof resourceSchema>;
export type CloudinaryUploadResponse = CloudinaryResource;
export interface CloudinaryListResult {
  resources: CloudinaryResource[];
  nextCursor?: string;
}
export interface CloudinarySearchResult extends CloudinaryListResult {
  totalCount: number;
  time?: number;
  aggregations?: Record<string, unknown>;
}
export const folderSchema = z.object({
  name: z.string(),
  path: z.string(),
  externalId: z.string().optional()
});
export type CloudinaryFolder = z.infer<typeof folderSchema>;
export interface CloudinaryFolderListResult {
  folders: CloudinaryFolder[];
  nextCursor?: string;
  totalCount?: number;
}
export const deleteSchema = z.object({
  deleted: z.record(z.string(), z.string()),
  partial: z.boolean().optional(),
  nextCursor: z.string().optional()
});
export const metricSchema = z.object({
  usage: z.number().optional(),
  limit: z.number().optional(),
  usedPercent: z.number().optional()
});
export const usageSchema = z.object({
  plan: z.string().optional(),
  lastUpdated: z.string().optional(),
  storage: metricSchema.optional(),
  bandwidth: metricSchema.optional(),
  transformations: metricSchema.optional(),
  requests: z.number().optional(),
  resources: z.number().optional(),
  derivedResources: z.number().optional()
});
