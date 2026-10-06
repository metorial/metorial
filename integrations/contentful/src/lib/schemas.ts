import { createApiServiceError } from 'slates';
import { z } from 'zod';

export { z };

export let invalid = (message: string) =>
  createApiServiceError(message, { reason: 'contentful_validation' });
export let malformed = () =>
  createApiServiceError(
    'Contentful returned an unexpected or mismatched resource. A preceding write may have succeeded; inspect the exact resource before retrying.',
    { reason: 'contentful_response' }
  );
export let resourceId = z
  .string()
  .min(1)
  .max(255)
  .refine(
    value =>
      value.trim() === value &&
      value !== '.' &&
      value !== '..' &&
      !Array.from(value).some(char => {
        let point = char.codePointAt(0) ?? 0;
        return point <= 32 || point === 127 || (point >= 0xd800 && point <= 0xdfff);
      }) &&
      !/[/%?#\\]/.test(value),
    'Use the exact resource ID, not a path or URL.'
  );
export let versionSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export let limitSchema = z.number().int().min(1).max(1000).optional();
export let skipSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional();
export let selection = {
  spaceId: resourceId
    .optional()
    .describe('Space ID from list_spaces. Overrides the optional saved space.'),
  environmentId: resourceId
    .optional()
    .describe(
      'Environment ID or alias from list_environments. Overrides the saved environment; defaults to master.'
    )
};
export let pageInput = {
  limit: limitSchema.describe('Page size, from 1 to 1000.'),
  skip: skipSchema.describe('Number of results to skip.')
};
export let pageOutput = {
  total: z.number().int().min(0).optional(),
  skip: z.number().int().min(0).optional(),
  limit: z.number().int().min(0).optional(),
  nextSkip: z.number().int().min(0).optional(),
  hasMore: z.boolean().optional()
};
export let linkSchema = z.object({
  sys: z.object({
    id: resourceId,
    type: z.string().optional(),
    linkType: z.string().optional()
  })
});
let nonnegativeInteger = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export let assetFieldsSchema = z
  .object({
    title: z.record(z.string(), z.string()).optional(),
    description: z.record(z.string(), z.string()).optional(),
    file: z
      .record(
        z.string(),
        z
          .object({
            fileName: z.string().min(1),
            contentType: z.string().min(1),
            upload: z.string().optional(),
            url: z.string().optional(),
            details: z
              .object({
                size: nonnegativeInteger.optional(),
                image: z
                  .object({ width: nonnegativeInteger, height: nonnegativeInteger })
                  .passthrough()
                  .optional()
              })
              .passthrough()
              .optional()
          })
          .passthrough()
      )
      .optional()
  })
  .passthrough();
export let contentTypeFieldsSchema = z.array(
  z
    .object({
      id: resourceId,
      name: z.string(),
      type: z.string(),
      required: z.boolean().optional(),
      localized: z.boolean().optional(),
      linkType: z.string().optional(),
      items: z
        .object({ type: z.string(), linkType: z.string().optional() })
        .passthrough()
        .optional()
    })
    .passthrough()
);
export let sysSchema = z.object({
  id: resourceId,
  type: z.string(),
  version: versionSchema.optional(),
  schemaVersion: z.string().optional(),
  space: linkSchema.optional(),
  environment: linkSchema.optional(),
  contentType: linkSchema.optional(),
  release: linkSchema.optional(),
  createdBy: linkSchema.optional(),
  updatedBy: linkSchema.optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  publishedVersion: versionSchema.optional(),
  archivedAt: z.string().optional(),
  status: z.union([z.string(), linkSchema]).optional(),
  visibility: z.string().optional()
});
export let entitySchema = z
  .object({
    sys: sysSchema,
    fields: z.any().optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    displayField: z.string().optional(),
    code: z.string().optional(),
    fallbackCode: z.string().nullable().optional(),
    default: z.boolean().optional(),
    optional: z.boolean().optional(),
    contentDeliveryApi: z.boolean().optional(),
    contentManagementApi: z.boolean().optional(),
    entities: z.unknown().optional(),
    action: z.string().optional(),
    environment: linkSchema.optional(),
    entity: linkSchema.optional(),
    scheduledFor: z
      .object({ datetime: z.string(), timezone: z.string().optional() })
      .optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    avatarUrl: z.string().optional()
  })
  .passthrough();
export type Entity = z.output<typeof entitySchema>;
export let parse = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success) throw malformed();
  return parsed.data;
};
export let parseInput = <T extends z.ZodType>(schema: T, value: unknown): z.output<T> => {
  let parsed = schema.safeParse(value);
  if (!parsed.success)
    throw invalid('Check the documented identifiers, versions, and input fields.');
  return parsed.data;
};
export let currentVersion = (entity: Entity) => {
  if (entity.sys.version === undefined) throw malformed();
  return entity.sys.version;
};
export let recovery = (kind: string, id: string, spaceId?: string, environmentId?: string) => {
  let error = invalid(
    `The ${kind} ${id} already exists, but the later operation was not confirmed. Inspect this exact resource and resume its lifecycle; do not create it again.`
  );
  Object.assign(error.data, { resourceId: id, resourceType: kind, spaceId, environmentId });
  return error;
};
