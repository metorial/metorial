import { createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };

export const invalid = (message: string) => createApiServiceError(message);
export const malformed = () =>
  invalid(
    'Sanity returned an unexpected or unconfirmed result. Read the exact resource before retrying a write; it may already have taken effect.'
  );
export const projectId = z
  .string()
  .regex(/^[-a-z0-9]+$/i)
  .max(128)
  .describe('Project ID. Call list_projects to discover accessible projects.');
export const dataset = z
  .string()
  .regex(/^(~[a-z0-9][-\w]{0,63}|[a-z0-9][-\w]{0,63})$/)
  .describe('Dataset name. Call manage_datasets with action list to discover datasets.');
export const documentId = z
  .string()
  .regex(/^[a-z0-9_][a-z0-9_.-]{0,127}$/i)
  .refine(value => !value.includes('..'))
  .describe(
    'Exact native document _id. Discover IDs with query_documents, mutation receipts, or upload_asset documentId/_id; upload_asset assetId is the content hash.'
  );
export const opaqueId = z
  .string()
  .min(1)
  .max(256)
  .refine(value =>
    Array.from(value).every(char => {
      const point = char.codePointAt(0) ?? 0;
      return point > 32 && point !== 127 && !(point >= 0xd800 && point <= 0xdfff);
    })
  );
export const apiVersion = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(value => {
    const time = Date.parse(value);
    return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
  });
export const scopes = { projectId: projectId.optional(), dataset: dataset.optional() };
export const record = z.record(z.string(), z.unknown());
export const nativeDocument = z
  .object({
    _id: documentId,
    _type: z.string().min(1),
    _rev: opaqueId,
    _createdAt: z.string(),
    _updatedAt: z.string()
  })
  .passthrough();
export const documentPage = z
  .object({
    documents: z.array(nativeDocument),
    omitted: z.array(z.object({ id: documentId, reason: z.string() }).passthrough()).optional()
  })
  .passthrough();
export const nativeProject = z
  .object({
    id: projectId,
    displayName: z.string(),
    organizationId: z.string().nullable().optional(),
    studioHost: z.string().nullable().optional(),
    createdAt: z.string().optional(),
    members: z
      .array(z.object({ id: z.string(), role: z.string().optional() }).passthrough())
      .optional()
  })
  .passthrough();
export const nativeDataset = z
  .object({ name: dataset, aclMode: z.string().optional() })
  .passthrough();
export const nativeProfile = z
  .object({
    id: z.string().min(1),
    name: z.string(),
    email: z.string(),
    profileImage: z.string().nullable().optional(),
    role: z.string().optional(),
    provider: z.string().optional()
  })
  .passthrough();
export const nativeHook = z
  .object({
    id: opaqueId,
    name: z.string(),
    url: z.string().url(),
    dataset: z.string(),
    type: z.enum(['document', 'transaction']),
    apiVersion: z.string().optional(),
    isDisabledByUser: z.boolean().optional(),
    isDisabled: z.boolean().optional(),
    deletedAt: z.string().nullable().optional()
  })
  .passthrough();
export const nativeAsset = nativeDocument
  .extend({
    _type: z.enum(['sanity.imageAsset', 'sanity.fileAsset']),
    assetId: z.string().min(1),
    url: z.string().url(),
    path: z.string(),
    mimeType: z.string(),
    size: z.number().int().nonnegative().safe(),
    sha1hash: z.string(),
    extension: z.string(),
    originalFilename: z.string().optional()
  })
  .passthrough();
export function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw malformed();
  return result.data;
}
export function input<T extends z.ZodType>(
  schema: T,
  value: unknown,
  message: string
): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw invalid(message);
  return result.data;
}
