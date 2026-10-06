import { z } from 'zod';

export const safeId = z.number().int().positive().safe();
export const count = z.number().int().nonnegative().safe();
export const paginationSchema = z.object({ page: count, pageSize: safeId, totalItems: count });
export const columnSchema = z.object({
  id: z.string().min(1),
  dataType: z.enum(['datetime', 'number', 'string'])
});
export const profileSchema = z.object({
  id: safeId,
  name: z.string(),
  email: z.string().optional(),
  timezone: z.string().optional(),
  role: z.string().optional(),
  organization: z.object({ id: safeId, name: z.string() }),
  account: z.object({ id: safeId, name: z.string() }).nullable().optional()
});
export const v1SourceSchema = z.object({
  id: safeId,
  title: z.string(),
  created: z.string(),
  timezone: z.string(),
  key: z.string(),
  ingestionSupported: z.boolean().optional()
});
export const v2SourceSchema = z.object({
  id: safeId,
  name: z.string(),
  createdAt: z.string(),
  timezone: z.string(),
  integrationKey: z.string()
});
export const v1DatasetSchema = z.object({
  id: z.uuid(),
  title: z
    .string()
    .nullable()
    .transform(value => value ?? ''),
  created: z.string()
});
export const v2DatasetSchema = z.object({
  id: safeId,
  name: z.string(),
  createdAt: z.string(),
  dataSourceId: safeId
});
const legacyCounts = z.object({
  receivedRecordsCount: count.optional(),
  appendedRecordsCount: count.optional(),
  overwrittenRecordsCount: count.optional(),
  rejectedRecordsCount: count.optional()
});
export const v1IngestionSchema = z.object({
  ingestionId: z.uuid(),
  timestamp: z.string(),
  status: z.string().optional(),
  metrics: z
    .object({
      datasetMetrics: z
        .object({
          columnsCount: count.optional(),
          datasetSizeMB: z.number().nonnegative().optional(),
          totalDatasetRecordsCount: count.optional()
        })
        .optional(),
      ingestionMetrics: legacyCounts.optional()
    })
    .optional()
});
export const v2IngestionSchema = z.object({
  id: z.uuid(),
  initiatedAt: z.string(),
  status: z.string(),
  duration: count.nullable().optional(),
  summary: z
    .object({
      ingestion: z
        .object({
          receivedRecordCount: count.optional(),
          appendedRecordCount: count.optional(),
          overwrittenRecordCount: count.optional(),
          rejectedRecordCount: count.optional()
        })
        .optional(),
      dataset: z
        .object({
          columnCount: count.optional(),
          rowCount: count.optional(),
          size: count.nullable().optional()
        })
        .optional()
    })
    .optional(),
  errors: z.array(z.unknown()).nullable().optional()
});
export const ingestionSummarySchema = z.object({
  ingestionId: z.string(),
  timestamp: z.string(),
  status: z.string().optional(),
  totalRows: z.number().optional(),
  validRows: z
    .number()
    .optional()
    .describe(
      'Appended plus overwritten records, only when both provider counts are available'
    ),
  invalidRows: z.number().optional(),
  appendedRows: z.number().optional(),
  overwrittenRows: z.number().optional(),
  errorCount: z.number().optional(),
  datasetMetrics: z.record(z.string(), z.unknown()).optional()
});
export const datasetIdHelp =
  'Dataset identifier from the selected API version: a UUID in v1 or a decimal integer encoded as text in v2. Call list_datasets to discover it.';
export const accountIdInput = z
  .number()
  .optional()
  .describe(
    'For v2, optional account ID sent as x-account-id when accounts are enabled on the organization. Omit to use the authenticated organization. v1 does not support this contextual header.'
  );
export const pageInput = z
  .number()
  .optional()
  .describe('Page number: v1 starts at 1; v2 starts at 0. Omit for the provider default.');
export const pageSizeInput = z
  .number()
  .optional()
  .describe('Page size. v1 ingestion default is 100; v2 list default is 25, maximum 100.');
export const idempotencyInput = z
  .string()
  .optional()
  .describe(
    'For v2 only, a unique Idempotency-Key for this operation, preferably a UUID. Reusing it within 24 hours returns the original result; never reuse it for different data.'
  );
