import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let syncAlert = SlateTrigger.create(spec, {
  name: 'Sync Alert',
  key: 'sync_alert',
  description:
    'Triggers when a sync alert is raised or resolved. Covers sync failures, record count deviations, runtime exceeded, and other alert conditions.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of alert event (sync.alert.raised or sync.alert.resolved).'),
      eventId: z.string().describe('Unique event identifier for deduplication.'),
      syncId: z.number().optional().describe('ID of the sync that triggered the alert.'),
      syncLabel: z.string().optional().describe('Label of the sync.'),
      alertType: z
        .string()
        .optional()
        .describe('Type of alert (e.g., failure, invalid_records, runtime).'),
      alertMessage: z.string().optional().describe('Alert message or description.'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload.')
    })
  )
  .output(
    z.object({
      syncId: z.number().optional().describe('ID of the affected sync.'),
      syncLabel: z.string().optional().describe('Label of the affected sync.'),
      alertType: z.string().optional().describe('Type of alert condition.'),
      alertMessage: z.string().optional().describe('Alert message.'),
      isResolved: z
        .boolean()
        .describe('Whether the alert was resolved (true) or raised (false).')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let webhook = await client.createWebhook({
        name: 'Slates Sync Alert Webhook',
        endpoint: ctx.input.webhookBaseUrl,
        description: 'Auto-registered by Slates integration for sync alert events.',
        events: ['sync.alert.raised', 'sync.alert.resolved']
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region
      });

      let details = ctx.input.registrationDetails as { webhookId: number };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (data.type as string) || (data.event as string) || 'sync.alert.raised';
      let syncData = (data.sync as Record<string, unknown>) || {};
      let alertData = (data.alert as Record<string, unknown>) || {};

      let syncId =
        (syncData.id as number) ?? (data.sync_id as number) ?? (data.syncId as number);
      let syncLabel =
        (syncData.label as string) ?? (syncData.name as string) ?? (data.sync_label as string);
      let alertType = (alertData.type as string) ?? (data.alert_type as string);
      let alertMessage = (alertData.message as string) ?? (data.message as string);

      let timestamp =
        (data.timestamp as string) || (data.created_at as string) || new Date().toISOString();
      let eventId = `${eventType}-${syncId || 'unknown'}-${timestamp}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            syncId,
            syncLabel,
            alertType,
            alertMessage,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let isResolved = ctx.input.eventType === 'sync.alert.resolved';

      return {
        type: isResolved ? 'sync_alert.resolved' : 'sync_alert.raised',
        id: ctx.input.eventId,
        output: {
          syncId: ctx.input.syncId,
          syncLabel: ctx.input.syncLabel,
          alertType: ctx.input.alertType,
          alertMessage: ctx.input.alertMessage,
          isResolved
        }
      };
    }
  })
  .build();
