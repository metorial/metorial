import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      syncId: z.number().describe('ID of the sync to retrieve.')
    })
  )
  .output(
    z.object({
      syncId: z.number().describe('Unique identifier of the sync.'),
      label: z.string().nullable().describe('Human-readable label.'),
      status: z.string().describe('Current sync status.'),
      operation: z.string().describe('Sync behavior type.'),
      paused: z.boolean().describe('Whether the sync is paused.'),
      sourceConnectionId: z.number().describe('ID of the source connection.'),
      sourceObjectType: z.string().describe('Type of source object (model or table).'),
      sourceObjectName: z.string().describe('Name of the source object.'),
      destinationConnectionId: z.number().describe('ID of the destination connection.'),
      destinationObject: z.string().describe('Name of the destination object.'),
      mappings: z.array(
        z.object({
          fromType: z.string().describe('Mapping source type (column or constant_value).'),
          fromData: z.unknown().describe('Mapping source data.'),
          to: z.string().describe('Destination field name.'),
          isPrimaryIdentifier: z
            .boolean()
            .describe('Whether this mapping is the primary identifier.')
        })
      ),
      scheduleFrequency: z.string().describe('Schedule frequency.'),
      cronExpression: z
        .string()
        .nullable()
        .describe('Cron expression if using expression-based scheduling.'),
      fieldBehavior: z
        .string()
        .nullable()
        .describe('Field sync behavior (sync_all_properties or specific_properties).'),
      failedRunNotificationsEnabled: z
        .boolean()
        .describe('Whether failed run notifications are enabled.'),
      failedRecordNotificationsEnabled: z
        .boolean()
        .describe('Whether failed record notifications are enabled.'),
      createdAt: z.string().describe('When the sync was created.'),
      updatedAt: z.string().describe('When the sync was last updated.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

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
      message: `Sync **${sync.label || sync.id}** is **${sync.status}** (${sync.operation}, ${sync.paused ? 'paused' : 'active'}).`
    };
  })
  .build();
