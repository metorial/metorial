import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let streamConfigSchema = z.object({
  name: z.string().describe('Name of the stream to sync.'),
  namespace: z
    .string()
    .optional()
    .describe(
      'Source stream namespace from get_stream_properties; distinguishes streams with the same name.'
    ),
  selectedFields: z
    .array(z.object({ fieldPath: z.array(z.string()) }))
    .optional()
    .describe('Optional explicit field paths to sync. Omit to include all fields.'),
  syncMode: z
    .enum([
      'full_refresh_overwrite',
      'full_refresh_append',
      'full_refresh_overwrite_deduped',
      'full_refresh_update',
      'full_refresh_soft_delete',
      'incremental_append',
      'incremental_deduped_history',
      'incremental_update',
      'incremental_soft_delete'
    ])
    .optional()
    .describe('Sync mode for this stream.'),
  cursorField: z
    .array(z.string())
    .optional()
    .describe('Cursor field path for incremental sync.'),
  primaryKey: z
    .array(z.array(z.string()))
    .optional()
    .describe('Primary key field paths for deduplication.')
});

export let updateConnectionTool = SlateTool.create(spec, {
  name: 'Update Connection',
  key: 'update_connection',
  description: `Update an existing Airbyte connection. Modify the name, status, schedule, stream configurations, or other settings. Only provided fields will be updated.`,
  instructions: [
    'Stream configurations are a **full overwrite** — you must include all desired streams, not just the ones you want to change. Omitted streams will be removed.'
  ],
  tags: { destructive: true },
  constraints: [
    'Stream configurations submitted through this tool overwrite existing stream configuration entirely.'
  ]
})
  .input(
    z.object({
      connectionId: z.string().describe('The UUID of the connection to update.'),
      name: z.string().optional().describe('New display name for the connection.'),
      status: z
        .enum(['active', 'inactive', 'deprecated'])
        .optional()
        .describe('Connection status.'),
      schedule: z
        .object({
          scheduleType: z
            .enum(['manual', 'cron'])
            .describe('Schedule type for the connection.'),
          cronExpression: z
            .string()
            .optional()
            .describe('Cron expression for automated syncs (UTC).')
        })
        .optional()
        .describe('Updated sync schedule.'),
      dataResidency: z
        .enum(['auto', 'us', 'eu'])
        .optional()
        .describe(
          'Legacy provider option. Current connections inherit their workspace data residency; changing it per connection is deprecated.'
        ),
      namespaceDefinition: z
        .enum(['source', 'destination', 'custom_format'])
        .optional()
        .describe('Namespace definition in the destination.'),
      namespaceFormat: z.string().optional().describe('Custom namespace format string.'),
      prefix: z
        .string()
        .optional()
        .describe('Prefix prepended to stream names at the destination.'),
      nonBreakingSchemaUpdatesBehavior: z
        .enum(['ignore', 'disable_connection', 'propagate_columns', 'propagate_fully'])
        .optional()
        .describe('How to handle non-breaking schema changes.'),
      streams: z
        .array(streamConfigSchema)
        .optional()
        .describe('Full replacement stream configurations.')
    })
  )
  .output(
    z.object({
      connectionId: z.string(),
      name: z.string(),
      sourceId: z.string(),
      destinationId: z.string(),
      workspaceId: z.string(),
      status: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) body.name = ctx.input.name;
    if (ctx.input.status !== undefined) body.status = ctx.input.status;
    if (ctx.input.schedule !== undefined) body.schedule = ctx.input.schedule;
    if (ctx.input.dataResidency !== undefined) body.dataResidency = ctx.input.dataResidency;
    if (ctx.input.namespaceDefinition !== undefined)
      body.namespaceDefinition = ctx.input.namespaceDefinition;
    if (ctx.input.namespaceFormat !== undefined)
      body.namespaceFormat = ctx.input.namespaceFormat;
    if (ctx.input.prefix !== undefined) body.prefix = ctx.input.prefix;
    if (ctx.input.nonBreakingSchemaUpdatesBehavior !== undefined)
      body.nonBreakingSchemaUpdatesBehavior = ctx.input.nonBreakingSchemaUpdatesBehavior;
    if (ctx.input.streams !== undefined) {
      body.configurations = { streams: ctx.input.streams };
    }

    let conn = await client.updateConnection(ctx.input.connectionId, body);

    return {
      output: {
        connectionId: conn.connectionId,
        name: conn.name,
        sourceId: conn.sourceId,
        destinationId: conn.destinationId,
        workspaceId: conn.workspaceId,
        status: conn.status
      },
      message: `Updated connection **${conn.name}** (ID: ${conn.connectionId}).`
    };
  })
  .build();
