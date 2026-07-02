import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let operationalWebhooksTrigger = SlateTrigger.create(spec, {
  name: 'Operational Webhooks',
  key: 'operational_webhooks',
  description:
    'Receives operational webhook events from Svix about your environment, such as endpoints being automatically disabled after persistent failures or message delivery attempts being exhausted.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Operational event type (e.g., "endpoint.disabled", "message.attempt.exhausted")'
        ),
      eventId: z.string().optional().describe('Unique event identifier'),
      timestamp: z.string().optional().describe('When the event occurred'),
      appId: z.string().optional().describe('Application ID related to the event'),
      appUid: z.string().optional().describe('Application UID related to the event'),
      endpointId: z.string().optional().describe('Endpoint ID related to the event'),
      msgId: z.string().optional().describe('Message ID related to the event'),
      msgEventId: z.string().optional().describe('Event ID of the message'),
      lastAttempt: z
        .object({
          attemptId: z.string().optional(),
          responseStatusCode: z.number().optional(),
          timestamp: z.string().optional()
        })
        .optional()
        .describe('Details of the last delivery attempt'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      applicationId: z.string().optional().describe('Application ID affected'),
      applicationUid: z.string().optional().describe('Application UID affected'),
      endpointId: z.string().optional().describe('Endpoint ID affected'),
      messageId: z.string().optional().describe('Message ID involved'),
      messageEventId: z.string().optional().describe('Event ID of the original message'),
      lastAttemptId: z.string().optional().describe('ID of the last delivery attempt'),
      lastAttemptStatusCode: z
        .number()
        .optional()
        .describe('HTTP status code of the last attempt'),
      lastAttemptTimestamp: z.string().optional().describe('When the last attempt was made'),
      timestamp: z.string().optional().describe('When the operational event occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region || 'us'
      });

      let endpoint = await client.createOperationalWebhookEndpoint({
        url: ctx.input.webhookBaseUrl,
        description: 'Slates operational webhook endpoint',
        filterTypes: [
          'endpoint.created',
          'endpoint.deleted',
          'endpoint.disabled',
          'endpoint.enabled',
          'endpoint.updated',
          'message.attempt.exhausted',
          'message.attempt.failing',
          'message.attempt.recovered'
        ]
      });

      return {
        registrationDetails: {
          endpointId: endpoint.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        region: ctx.config.region || 'us'
      });

      let endpointId = (ctx.input.registrationDetails as { endpointId: string }).endpointId;
      await client.deleteOperationalWebhookEndpoint(endpointId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let eventType = (body.type as string) || 'unknown';
      let eventData = (body.data as Record<string, unknown>) || {};

      let lastAttempt:
        | { attemptId?: string; responseStatusCode?: number; timestamp?: string }
        | undefined;
      if (eventData.lastAttempt && typeof eventData.lastAttempt === 'object') {
        let la = eventData.lastAttempt as Record<string, unknown>;
        lastAttempt = {
          attemptId: la.id as string | undefined,
          responseStatusCode: la.responseStatusCode as number | undefined,
          timestamp: la.timestamp as string | undefined
        };
      }

      let eventId =
        (body.eventId as string) || (body.id as string) || `${eventType}-${Date.now()}`;
      let timestamp = (body.timestamp as string) || new Date().toISOString();

      return {
        inputs: [
          {
            eventType,
            eventId,
            timestamp,
            appId: eventData.appId as string | undefined,
            appUid: eventData.appUid as string | undefined,
            endpointId: eventData.endpointId as string | undefined,
            msgId: eventData.msgId as string | undefined,
            msgEventId: eventData.msgEventId as string | undefined,
            lastAttempt,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId || `${ctx.input.eventType}-${Date.now()}`,
        output: {
          applicationId: ctx.input.appId,
          applicationUid: ctx.input.appUid,
          endpointId: ctx.input.endpointId,
          messageId: ctx.input.msgId,
          messageEventId: ctx.input.msgEventId,
          lastAttemptId: ctx.input.lastAttempt?.attemptId,
          lastAttemptStatusCode: ctx.input.lastAttempt?.responseStatusCode,
          lastAttemptTimestamp: ctx.input.lastAttempt?.timestamp,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
