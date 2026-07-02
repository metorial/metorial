import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let syncNotificationTrigger = SlateTrigger.create(spec, {
  name: 'Sync Notification',
  key: 'sync_notification',
  description:
    'Receive webhook notifications for Airbyte sync events including sync success, sync failure, schema changes, sync disabled warnings, and sync disabled events. Configure the webhook URL in your Airbyte workspace notification settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the notification event.'),
      eventId: z.string().describe('Unique identifier for this event.'),
      connectionId: z.string().optional().describe('UUID of the associated connection.'),
      connectionName: z.string().optional().describe('Name of the associated connection.'),
      sourceId: z.string().optional().describe('UUID of the associated source.'),
      destinationId: z.string().optional().describe('UUID of the associated destination.'),
      workspaceId: z.string().optional().describe('UUID of the workspace.'),
      errorMessage: z.string().optional().describe('Error message if the event is a failure.'),
      recordsEmitted: z.number().optional().describe('Number of records emitted.'),
      recordsCommitted: z.number().optional().describe('Number of records committed.'),
      bytesEmitted: z.number().optional().describe('Number of bytes emitted.'),
      bytesCommitted: z.number().optional().describe('Number of bytes committed.'),
      duration: z.string().optional().describe('Sync duration.'),
      rawPayload: z.any().optional().describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      connectionId: z.string().optional(),
      connectionName: z.string().optional(),
      sourceId: z.string().optional(),
      destinationId: z.string().optional(),
      workspaceId: z.string().optional(),
      errorMessage: z.string().optional(),
      recordsEmitted: z.number().optional(),
      recordsCommitted: z.number().optional(),
      bytesEmitted: z.number().optional(),
      bytesCommitted: z.number().optional(),
      duration: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Airbyte sends webhook payloads with various structures depending on notification type
      // We normalize them into a consistent format
      let eventType = data.type || data.notificationType || 'unknown';
      let eventId = data.id || data.jobId || `${eventType}-${Date.now()}`;

      // Extract common fields from the webhook payload
      let connectionId = data.connectionId || data.connection?.connectionId;
      let connectionName = data.connectionName || data.connection?.name;
      let sourceId = data.sourceId || data.source?.sourceId;
      let destinationId = data.destinationId || data.destination?.destinationId;
      let workspaceId = data.workspaceId || data.workspace?.workspaceId;

      // Extract sync stats if present
      let recordsEmitted = data.recordsEmitted ?? data.syncStats?.recordsEmitted;
      let recordsCommitted = data.recordsCommitted ?? data.syncStats?.recordsCommitted;
      let bytesEmitted = data.bytesEmitted ?? data.syncStats?.bytesEmitted;
      let bytesCommitted = data.bytesCommitted ?? data.syncStats?.bytesCommitted;
      let duration = data.duration ?? data.syncStats?.duration;

      // Extract error info if present
      let errorMessage =
        data.errorMessage ?? data.error?.message ?? data.failureReason?.externalMessage;

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: String(eventId),
            connectionId,
            connectionName,
            sourceId,
            destinationId,
            workspaceId,
            errorMessage,
            recordsEmitted,
            recordsCommitted,
            bytesEmitted,
            bytesCommitted,
            duration,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let normalizedType = normalizeEventType(ctx.input.eventType);

      return {
        type: normalizedType,
        id: ctx.input.eventId,
        output: {
          connectionId: ctx.input.connectionId,
          connectionName: ctx.input.connectionName,
          sourceId: ctx.input.sourceId,
          destinationId: ctx.input.destinationId,
          workspaceId: ctx.input.workspaceId,
          errorMessage: ctx.input.errorMessage,
          recordsEmitted: ctx.input.recordsEmitted,
          recordsCommitted: ctx.input.recordsCommitted,
          bytesEmitted: ctx.input.bytesEmitted,
          bytesCommitted: ctx.input.bytesCommitted,
          duration: ctx.input.duration
        }
      };
    }
  })
  .build();

let normalizeEventType = (eventType: string): string => {
  let lower = eventType.toLowerCase();
  if (lower.includes('success') || lower.includes('succeeded')) return 'sync.succeeded';
  if (lower.includes('fail')) return 'sync.failed';
  if (lower.includes('schema') && lower.includes('action'))
    return 'connection.schema_change_action_required';
  if (lower.includes('schema')) return 'connection.schema_change';
  if (lower.includes('disabled') && lower.includes('warn')) return 'sync.disabled_warning';
  if (lower.includes('disabled')) return 'sync.disabled';
  return `sync.${lower.replace(/\s+/g, '_')}`;
};
