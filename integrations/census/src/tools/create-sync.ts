import { SlateTool } from 'slates';
import { z } from 'zod';
import { type SyncWriteInput, workspaceClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

let mappingSchema = z.object({
  from: z.object({
    type: z
      .enum(['column', 'constant_value'])
      .describe(
        'Source type: "column" for a database column, "constant_value" for a fixed value.'
      ),
    data: z
      .union([
        z.string(),
        z.object({
          value: z.string(),
          basicType: z.string()
        })
      ])
      .describe(
        'Column name (if type is "column") or an object with value and basicType (if type is "constant_value").'
      )
  }),
  to: z.string().describe('Destination field name.'),
  isPrimaryIdentifier: z
    .boolean()
    .optional()
    .describe('Whether this mapping is the primary identifier for matching records.')
});

export let createSync = SlateTool.create(spec, {
  name: 'Create Sync',
  key: 'create_sync',
  description: `Creates a new data sync that moves data from a source (data warehouse) to a destination (SaaS tool). Configure the source object, destination object, field mappings, sync behavior, and schedule.`,
  instructions: [
    'Call list_source_objects and list_destination_objects to discover object names, supported operations and per-operation primary identifier requirements.',
    'Creating or scheduling a sync can query a warehouse, transfer data, incur costs and trigger notifications. Mirror can delete destination records.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      workspaceId,
      label: z.string().optional().describe('Human-readable label for the sync.'),
      operation: z
        .enum(['upsert', 'update', 'insert', 'mirror', 'append'])
        .describe(
          'Sync behavior: upsert (update or create), update (update only), insert (create only), mirror (full sync with deletes), append (event-style).'
        ),
      sourceConnectionId: z.number().describe('ID of the source connection (data warehouse).'),
      sourceObject: z
        .object({
          type: z
            .enum(['model', 'table'])
            .describe('Whether the source is a model or a table.'),
          name: z.string().describe('Name of the model or table.'),
          tableCatalog: z
            .string()
            .optional()
            .describe(
              'Database/catalog name for a table. If omitted, a unique table is discovered with list_source_objects.'
            ),
          tableSchema: z
            .string()
            .optional()
            .describe(
              'Schema name for a table. If omitted, a unique table is discovered with list_source_objects.'
            ),
          tableName: z.string().optional().describe('Table name (for table type).')
        })
        .describe('Source object configuration.'),
      destinationConnectionId: z
        .number()
        .describe('ID of the destination connection (SaaS tool).'),
      destinationObject: z
        .string()
        .describe('Name of the destination object (e.g., "Contact", "Lead").'),
      mappings: z.array(mappingSchema).describe('Field mappings from source to destination.'),
      scheduleFrequency: z
        .enum([
          'never',
          'continuous',
          'quarter_hourly',
          'hourly',
          'daily',
          'weekly',
          'expression'
        ])
        .optional()
        .describe('How often the sync should run.'),
      scheduleDay: z
        .string()
        .optional()
        .describe('Day of the week for weekly schedules (e.g., "monday").'),
      scheduleHour: z.number().optional().describe('Hour (0–24) for daily/weekly schedules.'),
      scheduleMinute: z
        .number()
        .optional()
        .describe('Minute (0-59) for daily/weekly schedules.'),
      cronExpression: z
        .string()
        .optional()
        .describe('Cron expression for expression-based schedules.'),
      paused: z.boolean().optional().describe('Whether to create the sync in a paused state.'),
      failedRunNotificationsEnabled: z
        .boolean()
        .optional()
        .describe('Enable failed-run email notifications (legacy provider option).'),
      failedRecordNotificationsEnabled: z
        .boolean()
        .optional()
        .describe('Enable failed-record email notifications (legacy provider option).'),
      alertAttributes: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Provider alert configurations. An empty array disables configured sync alerts.'
        )
    })
  )
  .output(
    z.object({
      syncId: z.number().describe('ID of the created sync.'),
      label: z.string().nullish().describe('Label of the created sync.'),
      status: z.string().describe('Initial status of the sync.'),
      operation: z.string().describe('Configured sync behavior.'),
      createdAt: z.string().nullish().describe('When the sync was created.')
    })
  )
  .handleInvocation(async ctx => {
    let client = await workspaceClient(ctx);

    let syncConfig: SyncWriteInput = {
      label: ctx.input.label,
      operation: ctx.input.operation,
      paused: ctx.input.paused,
      failedRunNotificationsEnabled: ctx.input.failedRunNotificationsEnabled,
      failedRecordNotificationsEnabled: ctx.input.failedRecordNotificationsEnabled,
      alertAttributes: ctx.input.alertAttributes,
      sourceAttributes: {
        connectionId: ctx.input.sourceConnectionId,
        object: ctx.input.sourceObject
      },
      destinationAttributes: {
        connectionId: ctx.input.destinationConnectionId,
        object: ctx.input.destinationObject
      },
      mappings: ctx.input.mappings.map(m => ({
        from: m.from,
        to: m.to,
        isPrimaryIdentifier: m.isPrimaryIdentifier ?? false
      })),
      scheduleFrequency: ctx.input.scheduleFrequency,
      scheduleDay: ctx.input.scheduleDay,
      scheduleHour: ctx.input.scheduleHour,
      scheduleMinute: ctx.input.scheduleMinute,
      cronExpression: ctx.input.cronExpression
    };

    let sync = await client.createSync(syncConfig);

    return {
      output: {
        syncId: sync.id,
        label: sync.label,
        status: sync.status,
        operation: sync.operation,
        createdAt: sync.createdAt
      },
      message: `Created sync **${sync.label || sync.id}** with ${sync.operation} behavior.`
    };
  })
  .build();
