import { z } from 'zod';

export const sourceSchema = z.object({
  sourceId: z.number().describe('Unique ID of the source'),
  name: z.string().describe('Name of the source'),
  slug: z.string().describe('URL-friendly slug for the source'),
  type: z.string().describe('Source type (e.g. snowflake, postgres, bigquery)'),
  configuration: z
    .record(z.string(), z.unknown())
    .describe('Configuration omitted to protect connection credentials'),
  workspaceId: z.number().describe('ID of the workspace the source belongs to'),
  createdAt: z.string().describe('ISO timestamp when the source was created'),
  updatedAt: z.string().describe('ISO timestamp when the source was last updated')
});

export const destinationSchema = z.object({
  destinationId: z.number().describe('Unique ID of the destination'),
  name: z.string().describe('Name of the destination'),
  slug: z.string().describe('URL-friendly slug for the destination'),
  type: z.string().describe('Destination type (e.g. salesforce, hubspot)'),
  configuration: z
    .record(z.string(), z.unknown())
    .describe('Configuration omitted to protect connection credentials'),
  syncs: z
    .array(z.number())
    .optional()
    .describe('IDs of syncs sending data to this destination'),
  workspaceId: z.number().describe('ID of the workspace the destination belongs to'),
  createdAt: z.string().describe('ISO timestamp when the destination was created'),
  updatedAt: z.string().describe('ISO timestamp when the destination was last updated')
});

export const modelSchema = z.object({
  modelId: z.number().describe('Unique ID of the model'),
  name: z.string().describe('Name of the model'),
  slug: z.string().describe('URL-friendly slug for the model'),
  sourceId: z.number().describe('ID of the source this model queries'),
  primaryKey: z
    .string()
    .nullable()
    .describe('Primary key column used for change data capture'),
  queryType: z.string().describe('Query type: custom, raw_sql, table, dbt, or visual'),
  isSchema: z.boolean().describe('Whether this model is used as a base for other models'),
  syncs: z.array(z.number()).optional().describe('IDs of syncs using this model'),
  tags: z.record(z.string(), z.string()).optional().describe('Key-value metadata tags'),
  raw: z.object({ sql: z.string() }).optional().describe('Raw SQL query definition'),
  table: z
    .object({ name: z.string() })
    .optional()
    .describe('Table name for table-based queries'),
  dbt: z.object({ modelId: z.string() }).optional().describe('dbt model reference'),
  custom: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Custom query for non-SQL sources'),
  visual: z.record(z.string(), z.unknown()).optional().describe('Visual query definition'),
  folderId: z.string().optional().nullable().describe('Folder ID for organizing models'),
  workspaceId: z.number().describe('ID of the workspace'),
  createdAt: z.string().describe('ISO timestamp when the model was created'),
  updatedAt: z.string().describe('ISO timestamp when the model was last updated')
});

export const scheduleSchema = z
  .object({
    type: z.string().describe('Schedule type (e.g. interval, cron, visual_cron, dbt_cloud)'),
    schedule: z
      .record(z.string(), z.unknown())
      .optional()
      .describe('Schedule configuration; omitted for match_booster schedules')
  })
  .optional()
  .nullable();

export const syncSchema = z.object({
  syncId: z.number().describe('Unique ID of the sync'),
  slug: z.string().describe('URL-friendly slug for the sync'),
  destinationId: z.number().describe('ID of the destination'),
  modelId: z.number().describe('ID of the model'),
  configuration: z
    .record(z.string(), z.unknown())
    .describe('Configuration omitted to protect destination credentials'),
  disabled: z.boolean().describe('Whether the sync is disabled'),
  status: z.string().describe('Current sync status'),
  primaryKey: z.string().describe('Primary key used for identifying source data'),
  referencedColumns: z.array(z.string()).describe('Source columns the sync depends on'),
  schedule: scheduleSchema.describe('Sync schedule configuration'),
  lastRunAt: z.string().nullable().optional().describe('ISO timestamp of the last sync run'),
  workspaceId: z.number().describe('ID of the workspace'),
  createdAt: z.string().describe('ISO timestamp when the sync was created'),
  updatedAt: z.string().describe('ISO timestamp when the sync was last updated')
});

export const rowCountsSchema = z.object({
  addedCount: z.number().describe('Number of rows added'),
  changedCount: z.number().describe('Number of rows changed'),
  removedCount: z.number().describe('Number of rows removed')
});

export const syncRunSchema = z.object({
  runId: z.number().describe('Unique ID of the sync run'),
  status: z
    .string()
    .describe(
      'Status of the run (e.g. success, failed, cancelled, interrupted, warning, queued, processing)'
    ),
  completionRatio: z.number().describe('Completion ratio from 0 to 1'),
  querySize: z.number().describe('Number of rows in the query result'),
  plannedRows: rowCountsSchema.describe('Rows planned for syncing'),
  successfulRows: rowCountsSchema.describe('Rows successfully synced'),
  failedRows: rowCountsSchema.describe('Rows that failed to sync'),
  error: z.string().nullable().optional().describe('Error message if the run failed'),
  createdAt: z.string().describe('ISO timestamp when the run was created'),
  startedAt: z.string().describe('ISO timestamp when the run started'),
  finishedAt: z.string().describe('ISO timestamp when the run finished')
});
