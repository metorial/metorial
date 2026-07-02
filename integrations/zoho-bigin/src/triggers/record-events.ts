import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BiginClient } from '../lib/client';
import { spec } from '../spec';

export let recordEvents = SlateTrigger.create(spec, {
  name: 'Record Events',
  key: 'record_events',
  description:
    'Receive real-time notifications when records are created, edited, or deleted in any Bigin module (Contacts, Accounts, Pipelines, Products, Tasks, Events, Calls).'
})
  .input(
    z.object({
      moduleName: z.string().describe('Module API name where the event occurred'),
      operation: z.string().describe('Operation type: create, edit, or delete'),
      resourceUri: z.string().optional().describe('API URI of the affected resource'),
      channelId: z.string().optional().describe('Notification channel identifier'),
      recordIds: z.array(z.string()).optional().describe('IDs of the affected records'),
      token: z.string().optional().describe('Verification token')
    })
  )
  .output(
    z.object({
      moduleName: z.string().describe('Module where the event occurred'),
      operation: z.string().describe('Operation type (create, edit, delete)'),
      recordIds: z.array(z.string()).describe('IDs of the affected records'),
      channelId: z.string().optional().describe('Notification channel identifier'),
      resourceUri: z.string().optional().describe('API URI of the affected resource')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BiginClient({
        token: ctx.auth.token,
        apiDomain: ctx.auth.apiDomain
      });

      let channelId = `${Date.now()}`;
      let verificationToken = 'slates_bigin_webhook';

      let events = [
        'Contacts.all',
        'Accounts.all',
        'Pipelines.all',
        'Products.all',
        'Tasks.all',
        'Events.all',
        'Calls.all'
      ];

      let channelExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();

      let result = await client.enableNotifications(
        ctx.input.webhookBaseUrl,
        events,
        channelId,
        verificationToken,
        channelExpiry
      );

      return {
        registrationDetails: {
          channelId,
          verificationToken,
          events,
          response: result
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BiginClient({
        token: ctx.auth.token,
        apiDomain: ctx.auth.apiDomain
      });

      let channelId = ctx.input.registrationDetails?.channelId;
      if (channelId) {
        await client.disableNotifications([channelId]);
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Bigin sends notification payload with module, operation, and affected record IDs
      // The payload can contain multiple notification entries
      let notifications = body.notifications || (body.module ? [body] : []);

      if (notifications.length === 0 && body.query_map) {
        // Alternative payload format from Bigin
        notifications = [
          {
            module: body.module || body.query_map?.module,
            operation: body.operation || body.query_map?.operation,
            channel_id: body.channel_id || body.query_map?.channel_id,
            resource_uri: body.resource_uri,
            ids: body.ids || [],
            token: body.token
          }
        ];
      }

      let inputs = notifications
        .filter((n: any) => n.module || n.resource_uri)
        .map((n: any) => {
          let moduleName = n.module || n.resource_name || '';
          let operation = n.operation || 'unknown';
          let recordIds = n.ids || [];
          if (typeof recordIds === 'string') {
            recordIds = recordIds.split(',').map((id: string) => id.trim());
          }

          return {
            moduleName,
            operation,
            resourceUri: n.resource_uri,
            channelId: n.channel_id ? String(n.channel_id) : undefined,
            recordIds,
            token: n.token
          };
        });

      return { inputs };
    },

    handleEvent: async ctx => {
      let moduleLower = (ctx.input.moduleName || 'record').toLowerCase();
      let operation = (ctx.input.operation || 'unknown').toLowerCase();
      let recordIds = ctx.input.recordIds || [];
      let eventId = `${ctx.input.moduleName}-${operation}-${recordIds.join(',')}-${Date.now()}`;

      return {
        type: `${moduleLower}.${operation}`,
        id: eventId,
        output: {
          moduleName: ctx.input.moduleName,
          operation,
          recordIds,
          channelId: ctx.input.channelId,
          resourceUri: ctx.input.resourceUri
        }
      };
    }
  })
  .build();
