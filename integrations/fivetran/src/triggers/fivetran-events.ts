import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { FivetranClient } from '../lib/client';
import { spec } from '../spec';

let fivetranEventTypes = [
  'sync_start',
  'sync_end',
  'status',
  'transformation_run_start',
  'transformation_run_succeeded',
  'transformation_run_failed',
  'dbt_run_start',
  'dbt_run_succeeded',
  'dbt_run_failed'
] as const;

export let fivetranEvents = SlateTrigger.create(spec, {
  name: 'Fivetran Events',
  key: 'fivetran_events',
  description:
    'Receives webhook notifications for sync events, transformation run events, and dbt run events from Fivetran.'
})
  .input(
    z.object({
      event: z
        .string()
        .describe('Event type (e.g., sync_start, sync_end, transformation_run_succeeded)'),
      created: z.string().describe('Timestamp when the event was created'),
      connectorType: z.string().optional().describe('Connector service type'),
      connectorId: z.string().optional().describe('ID of the connection/connector'),
      connectorName: z.string().optional().describe('Name of the connection/connector'),
      syncId: z.string().optional().describe('ID of the sync'),
      destinationGroupId: z.string().optional().describe('Destination group ID'),
      eventStatus: z
        .string()
        .optional()
        .describe('Status from event data (e.g., SUCCESSFUL, FAILURE_WITH_TASK)'),
      eventReason: z.string().optional().describe('Failure reason, if applicable')
    })
  )
  .output(
    z.object({
      event: z.string().describe('Event type'),
      created: z.string().describe('Event timestamp'),
      connectorType: z.string().optional().describe('Connector service type'),
      connectionId: z.string().optional().describe('Connection/connector ID'),
      connectionName: z.string().optional().describe('Connection/connector name'),
      syncId: z.string().optional().describe('Sync ID'),
      groupId: z.string().optional().describe('Destination group ID'),
      status: z
        .string()
        .optional()
        .describe('Status from event data (e.g., SUCCESSFUL, FAILURE_WITH_TASK)'),
      reason: z.string().optional().describe('Failure reason, if applicable')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new FivetranClient(ctx.auth.token);

      let webhook = await client.createAccountWebhook({
        url: ctx.input.webhookBaseUrl,
        events: [...fivetranEventTypes],
        active: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new FivetranClient(ctx.auth.token);
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, any>;
      let eventData = body.data as Record<string, any> | undefined;

      return {
        inputs: [
          {
            event: body.event,
            created: body.created,
            connectorType: body.connector_type,
            connectorId: body.connector_id,
            connectorName: body.connector_name,
            syncId: body.sync_id,
            destinationGroupId: body.destination_group_id,
            eventStatus: eventData?.status as string | undefined,
            eventReason: eventData?.reason as string | undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      let eventId = [input.event, input.connectorId, input.syncId, input.created]
        .filter(Boolean)
        .join('-');

      return {
        type: input.event,
        id: eventId,
        output: {
          event: input.event,
          created: input.created,
          connectorType: input.connectorType,
          connectionId: input.connectorId,
          connectionName: input.connectorName,
          syncId: input.syncId,
          groupId: input.destinationGroupId,
          status: input.eventStatus,
          reason: input.eventReason
        }
      };
    }
  })
  .build();
