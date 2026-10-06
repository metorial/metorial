import { createApiServiceError } from 'slates';
import { z } from 'zod';
import { containsCredential } from './errors';
export const sourceId = z
  .string()
  .min(1)
  .describe('Exact source ID. Call list_sources to discover authorized source IDs.');
export const originPath = z
  .string()
  .min(1)
  .describe(
    'Exact unencoded origin path from list_assets or get_asset, with or without its leading slash.'
  );
export const pageNumber = z
  .number()
  .int()
  .nonnegative()
  .optional()
  .default(0)
  .describe('Zero-based native page number.');
export const pageSize = z
  .number()
  .int()
  .min(1)
  .max(1000)
  .optional()
  .default(20)
  .describe('Number of records on this page, bounded to 1000 by this tool.');
export const deploymentTypes = z.enum([
  's3',
  'gcs',
  'azure',
  'webfolder',
  'webproxy',
  's3_compatible'
]);
const optionalText = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
const optionalInteger = z
  .number()
  .int()
  .nonnegative()
  .safe()
  .nullish()
  .transform(value => value ?? undefined);
const optionalBoolean = z
  .boolean()
  .nullish()
  .transform(value => value ?? undefined);
const strings = z
  .array(z.string())
  .nullish()
  .transform(value => value ?? undefined);
export const primitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);
export const metadata = z.record(z.string(), primitive);
export const publicDeployment = z.object({
  type: optionalText,
  imgix_subdomains: strings,
  custom_domains: strings,
  secure_url_enabled: optionalBoolean,
  cache_ttl_behavior: optionalText,
  cache_ttl_value: optionalInteger,
  cache_ttl_error: optionalInteger,
  default_params: metadata.nullish().transform(value => value ?? undefined),
  image_error: optionalText,
  image_missing: optionalText,
  s3_bucket: optionalText,
  s3_prefix: optionalText,
  gcs_bucket: optionalText,
  gcs_prefix: optionalText,
  azure_account: optionalText,
  azure_bucket: optionalText,
  azure_prefix: optionalText,
  azure_service_type: optionalText,
  bucket_name: optionalText,
  region: optionalText,
  storage_provider: optionalText,
  password_set: optionalBoolean,
  request_handshake_set: optionalBoolean,
  request_signing_key_set: optionalBoolean,
  allows_upload: optionalBoolean
});
export const sourceResource = z.object({
  id: z.string().min(1),
  type: z.literal('sources'),
  attributes: z.object({
    name: z.string().min(1),
    enabled: z.boolean(),
    deployment_status: z.string().min(1),
    date_deployed: optionalInteger,
    deployment: publicDeployment.optional(),
    secure_url_token: optionalText
  }),
  relationships: z
    .object({
      account: z.object({
        data: z.object({ id: z.string().min(1), type: z.literal('accounts') })
      })
    })
    .optional()
});
export const sourceOutput = z.object({
  sourceId: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  deploymentStatus: z.string(),
  deploymentType: z.string().optional(),
  imgixSubdomains: z.array(z.string()).optional(),
  customDomains: z.array(z.string()).optional(),
  dateDeployed: z.number().optional(),
  accountId: z.string().optional()
});
export function mapSource(source: z.infer<typeof sourceResource>, credentials: string[] = []) {
  const a = source.attributes;
  const output = {
    sourceId: source.id,
    name: a.name,
    enabled: a.enabled,
    deploymentStatus: a.deployment_status,
    deploymentType: a.deployment?.type,
    imgixSubdomains: a.deployment?.imgix_subdomains,
    customDomains: a.deployment?.custom_domains,
    dateDeployed: a.date_deployed,
    accountId: source.relationships?.account.data.id
  };
  if (
    [a.secure_url_token, ...credentials].some(
      secret => secret && containsCredential({ ...output, deployment: a.deployment }, secret)
    )
  )
    throw createApiServiceError(
      'The source receipt reflects a credential. Inspect the source in the dashboard before repeating a mutation.',
      { parent: {} }
    );
  return output;
}
export const pagination = z.object({
  currentPage: z.number().int().nonnegative().safe(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean().optional(),
  nextPage: z.number().int().nonnegative().safe().nullish(),
  previousPage: z.number().int().nonnegative().safe().nullish(),
  pageSize: z.number().int().positive().safe(),
  totalPages: optionalInteger,
  totalRecords: optionalInteger
});
export const assetResource = z.object({
  id: z.string().min(1),
  type: z.literal('assets'),
  attributes: z.object({
    origin_path: z.string().min(1),
    source_id: optionalText,
    name: optionalText,
    description: optionalText,
    media_kind: optionalText,
    media_height: optionalInteger,
    media_width: optionalInteger,
    file_size: optionalInteger,
    categories: strings,
    tags: z
      .union([z.record(z.string(), z.number()), z.array(z.string())])
      .nullish()
      .transform(value => value ?? undefined),
    colors: z
      .record(z.string(), z.unknown())
      .nullish()
      .transform(value => value ?? undefined),
    face_count: optionalInteger,
    custom_fields: metadata.nullish().transform(value => value ?? undefined),
    analyzed_content_warnings: optionalBoolean,
    warning_adult: optionalInteger,
    warning_medical: optionalInteger,
    warning_racy: optionalInteger,
    warning_spoof: optionalInteger,
    warning_violence: optionalInteger,
    content_type: optionalText
  })
});
export const assetOutput = z.object({
  originPath: z.string(),
  assetId: z.string(),
  sourceId: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  mediaKind: z.string().optional(),
  mediaHeight: z.number().optional(),
  mediaWidth: z.number().optional(),
  fileSize: z.number().optional(),
  categories: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  tagScores: z.record(z.string(), z.number()).optional(),
  colors: z.record(z.string(), z.unknown()).optional(),
  faceCount: z.number().optional(),
  customFields: z.record(z.string(), z.string()).optional(),
  customValues: metadata.optional(),
  contentWarnings: z.record(z.string(), z.number()).optional(),
  analyzedContentWarnings: z.boolean().optional(),
  contentType: z.string().optional()
});
export function mapAsset(asset: z.infer<typeof assetResource>) {
  const a = asset.attributes;
  const warnings = Object.fromEntries(
    Object.entries({
      adult: a.warning_adult,
      medical: a.warning_medical,
      racy: a.warning_racy,
      spoof: a.warning_spoof,
      violence: a.warning_violence
    }).filter((pair): pair is [string, number] => pair[1] !== undefined)
  );
  return {
    originPath: a.origin_path,
    assetId: asset.id,
    sourceId: a.source_id,
    name: a.name,
    description: a.description,
    mediaKind: a.media_kind,
    mediaHeight: a.media_height,
    mediaWidth: a.media_width,
    fileSize: a.file_size,
    categories: a.categories,
    tags:
      a.tags === undefined ? undefined : Array.isArray(a.tags) ? a.tags : Object.keys(a.tags),
    tagScores: a.tags && !Array.isArray(a.tags) ? a.tags : undefined,
    colors: a.colors,
    faceCount: a.face_count,
    customFields:
      a.custom_fields === undefined
        ? undefined
        : Object.fromEntries(
            Object.entries(a.custom_fields).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string'
            )
          ),
    customValues: a.custom_fields,
    contentWarnings: Object.keys(warnings).length ? warnings : undefined,
    analyzedContentWarnings: a.analyzed_content_warnings,
    contentType: a.content_type
  };
}
export const reportResource = z.object({
  id: z.string().min(1),
  type: z.literal('reports'),
  attributes: z.object({
    completed: z.boolean(),
    report_type: z.string().min(1),
    report_key: optionalText,
    period_start: optionalInteger,
    period_end: optionalInteger,
    files: strings
  })
});
export const reportOutput = z.object({
  reportId: z.string(),
  reportType: z.string(),
  reportKey: z.string().optional(),
  completed: z.boolean(),
  periodStart: z.number().optional(),
  periodEnd: z.number().optional(),
  files: z.array(z.string()).optional()
});
export function mapReport(report: z.infer<typeof reportResource>) {
  const a = report.attributes;
  return {
    reportId: report.id,
    reportType: a.report_type,
    reportKey: a.report_key,
    completed: a.completed,
    periodStart: a.period_start,
    periodEnd: a.period_end,
    files: a.files
  };
}
