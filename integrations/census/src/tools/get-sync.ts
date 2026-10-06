import { SlateTool } from 'slates';
import { z } from 'zod';
import { workspaceClient } from '../lib/client';
import { workspaceId } from '../lib/schemas';
import { spec } from '../spec';

export let getSync = SlateTool.create(spec, {
  name: 'Get Sync',
  key: 'get_sync',
  description: `Retrieves the full configuration and current status of a specific sync, including source and destination details, field mappings, schedule, and notification settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId,
      syncId: z.number().describe('ID of the sync to retrieve.')
    })
  )
  .output(
    z.object({
      syncId: z.number().describe('Unique identifier of the sync.'),
      label: z.string().nullish().describe('Human-readable label.'),
      status: z.string().describe('Current sync status.'),
      operation: z.string().describe('Sync behavior type.'),
      paused: z.boolean().optional().describe('Whether the sync is paused.'),
      sourceConnectionId: z.number().optional().describe('ID of the source connection.'),
      sourceObjectType: z.string().describe('Type of source object (model or table).'),
      sourceObjectName: z.string().optional().describe('Name of the source object.'),
      sourceObjectId: z
        .number()
        .optional()
        .describe('Native source object ID, when supplied.'),
      sourceTableCatalog: z
        .string()
        .optional()
        .describe('Catalog/database of a table source.'),
      sourceTableSchema: z.string().optional().describe('Schema of a table source.'),
      sourceTableName: z.string().optional().describe('Exact name of a table source.'),
      destinationConnectionId: z.number().describe('ID of the destination connection.'),
      destinationObject: z.string().describe('Name of the destination object.'),
      mappings: z.array(
        z.object({
          fromType: z.string().describe('Mapping source type (column or constant_value).'),
          fromData: z.unknown().describe('Mapping source data.'),
          to: z.string().describe('Destination field name.'),
          isPrimaryIdentifier: z
            .boolean()
            .optional()
            .describe('Whether this mapping is the primary identifier.')
        })
      ),
      scheduleFrequency: z.string().optional().describe('Schedule frequency.'),
      cronExpression: z
        .string()
        .nullish()
        .describe('Cron expression if using expression-based scheduling.'),
      fieldBehavior: z
        .string()
        .nullish()
        .describe('Field sync behavior (sync_all_properties or specific_properties).'),
      failedRunNotificationsEnabled: z
        .boolean()
        .optional()
        .describe('Whether failed run notifications are enabled.'),
      failedRecordNotificationsEnabled: z
        .boolean()
        .optional()
        .describe('Whether failed record notifications are enabled.'),
      createdAt: z.string().nullish().describe('When the sync was created.'),
      updatedAt: z.string().nullish().describe('When the sync was last updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = await workspaceClient(ctx);

    let sync = await client.getSync(ctx.input.syncId);

    let mappings = (sync.mappings || []).map(m => ({
      fromType: m.from.type,
      fromData: m.from.data,
      to: m.to,
      isPrimaryIdentifier: m.isPrimaryIdentifier
    }));

    return {
      output: {
        syncId: sync.id,
        label: sync.label,
        status: sync.status,
        operation: sync.operation,
        paused: sync.paused,
        sourceConnectionId: sync.sourceAttributes?.connectionId,
        sourceObjectType: sync.sourceAttributes?.object?.type,
        sourceObjectName: sync.sourceAttributes?.object?.name,
        sourceObjectId: sync.sourceAttributes.object.id,
        sourceTableCatalog: sync.sourceAttributes.object.tableCatalog,
        sourceTableSchema: sync.sourceAttributes.object.tableSchema,
        sourceTableName: sync.sourceAttributes.object.tableName,
        destinationConnectionId: sync.destinationAttributes?.connectionId,
        destinationObject: sync.destinationAttributes?.object,
        mappings,
        scheduleFrequency: sync.scheduleFrequency,
        cronExpression: sync.cronExpression,
        fieldBehavior: sync.fieldBehavior,
        failedRunNotificationsEnabled: sync.failedRunNotificationsEnabled,
        failedRecordNotificationsEnabled: sync.failedRecordNotificationsEnabled,
        createdAt: sync.createdAt,
        updatedAt: sync.updatedAt
      },
      message: `Sync **${sync.label || sync.id}** is **${sync.status}** (${sync.operation}, ${sync.paused === undefined ? 'pause state unavailable' : sync.paused ? 'paused' : 'active'}).`
    };
  })
  .build();
