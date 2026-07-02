import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let streamConfigSchema = z.object({
  name: z.string().describe('Name of the stream to sync.'),
  syncMode: z
    .enum([
      'full_refresh_overwrite',
      'full_refresh_append',
      'incremental_append',
      'incremental_deduped_history'
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

export let createConnectionTool = SlateTool.create(spec, {
  name: 'Create Connection',
  key: 'create_connection',
  description: `Create a new connection linking a source to a destination in Airbyte. Define which streams to sync, the sync mode, and the sync schedule. Defaults to manual schedule with full_refresh_overwrite for all streams if not specified.`,
  instructions: [
    'Use the "Get Stream Properties" tool to discover available streams and their sync modes before creating a connection.',
    'Cron expressions must follow UTC timezone. Minimum sync frequency is hourly.'
  ]
})
  .input(
    z.object({
      sourceId: z.string().describe('UUID of the source connector.'),
      destinationId: z.string().describe('UUID of the destination connector.'),
      name: z
        .string()
        .optional()
        .describe('Display name for the connection. Defaults to "source → destination".'),
      schedule: z
        .object({
          scheduleType: z
            .enum(['manual', 'cron'])
            .describe('Schedule type for the connection.'),
          cronExpression: z
            .string()
            .optional()
            .describe(
              'Cron expression for automated syncs (UTC). Required if scheduleType is "cron".'
            )
        })
        .optional()
        .describe('Sync schedule. Defaults to manual.'),
      namespaceDefinition: z
        .enum(['source', 'destination', 'custom_format'])
        .optional()
        .describe('Namespace definition in the destination.'),
      namespaceFormat: z
        .string()
        .optional()
        .describe(
          'Custom namespace format string (when namespaceDefinition is "custom_format").'
        ),
      prefix: z
        .string()
        .optional()
        .describe('Prefix prepended to stream names at the destination.'),
      nonBreakingSchemaUpdatesBehavior: z
        .enum(['ignore', 'disable_connection', 'propagate_columns', 'propagate_fully'])
        .optional()
        .describe('How to handle non-breaking schema changes.'),
      status: z.enum(['active', 'inactive']).optional().describe('Initial connection status.'),
      dataResidency: z
        .enum(['auto', 'us', 'eu'])
        .optional()
        .describe('Data processing region.'),
      streams: z
        .array(streamConfigSchema)
        .optional()
        .describe(
          'Stream configurations. If not specified, all streams sync with default settings.'
        )
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

    let conn = await client.createConnection({
      sourceId: ctx.input.sourceId,
      destinationId: ctx.input.destinationId,
      name: ctx.input.name,
      schedule: ctx.input.schedule,
      namespaceDefinition: ctx.input.namespaceDefinition,
      namespaceFormat: ctx.input.namespaceFormat,
      prefix: ctx.input.prefix,
      nonBreakingSchemaUpdatesBehavior: ctx.input.nonBreakingSchemaUpdatesBehavior,
      status: ctx.input.status,
      dataResidency: ctx.input.dataResidency,
      configurations: ctx.input.streams ? { streams: ctx.input.streams } : undefined
    });

    return {
      output: {
        connectionId: conn.connectionId,
        name: conn.name,
        sourceId: conn.sourceId,
        destinationId: conn.destinationId,
        workspaceId: conn.workspaceId,
        status: conn.status
      },
      message: `Created connection **${conn.name}** (ID: ${conn.connectionId}).`
    };
  })
  .build();
