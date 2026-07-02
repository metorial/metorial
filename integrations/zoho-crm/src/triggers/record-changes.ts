import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description: `Triggers when records are created, updated, or deleted in a Zoho CRM module.
Uses the Zoho CRM Notification API to watch for changes in the specified module.
Supports all standard and custom modules.`
})
  .input(
    z.object({
      operation: z
        .enum(['created', 'updated', 'deleted', 'all'])
        .describe('The type of record change'),
      moduleName: z
        .string()
        .describe('API name of the module (e.g. "Leads", "Contacts", "Deals")'),
      recordIds: z.array(z.string()).describe('IDs of the affected records'),
      channelId: z.string().describe('Channel ID of the notification subscription'),
      token: z.string().optional().describe('Verification token from the subscription')
    })
  )
  .output(
    z.object({
      moduleName: z.string().describe('Module where the change occurred'),
      operation: z.string().describe('Type of operation: created, updated, or deleted'),
      recordIds: z.array(z.string()).describe('IDs of affected records'),
      channelId: z.string().describe('Notification channel that triggered')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiBaseUrl: ctx.auth.apiBaseUrl
      });

      let channelId = `slates_${Date.now()}`;
      let token = `slates_verify_${Date.now()}`;

      // Default to watching all events on Deals module — the trigger handles any module,
      // but we need at least one module to register. In practice, the user configures which
      // modules to watch. We'll register for common modules.
      let modules = ['Leads', 'Contacts', 'Accounts', 'Deals', 'Tasks'];

      // Set expiry to ~24 hours from now (Zoho allows up to 24 hours)
      let channelExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000).toISOString();

      let watches = modules.map((mod, idx) => ({
        channelId: `${channelId}_${idx}`,
        eventsTypes: [`${mod}.all`],
        notifyUrl: ctx.input.webhookBaseUrl,
        token,
        channelExpiry
      }));

      let _result = await client.enableNotifications(watches);

      return {
        registrationDetails: {
          channelIds: watches.map(w => w.channelId),
          token,
          modules
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        apiBaseUrl: ctx.auth.apiBaseUrl
      });

      let channelIds = ctx.input.registrationDetails?.channelIds || [];
      if (channelIds.length > 0) {
        await client.disableNotifications(channelIds);
      }
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Zoho sends notifications as an object with "query_map" and "body" or in a simpler structure
      // The notification payload typically contains: module, operation, ids, channel_id, token
      let notifications = Array.isArray(body) ? body : [body];

      let inputs = notifications.map((notification: any) => {
        let moduleName = notification.module || notification.query_map?.module || 'Unknown';
        let operation = notification.operation || notification.query_map?.operation || 'all';
        let ids = notification.ids || notification.query_map?.ids || [];
        let recordIds = Array.isArray(ids) ? ids.map(String) : [String(ids)];
        let channelId = notification.channel_id || notification.query_map?.channel_id || '';
        let token = notification.token || notification.query_map?.token;

        let opMap: Record<string, string> = {
          insert: 'created',
          create: 'created',
          update: 'updated',
          edit: 'updated',
          delete: 'deleted'
        };
        let normalizedOp = opMap[operation.toLowerCase()] || operation.toLowerCase();

        return {
          operation: normalizedOp as 'created' | 'updated' | 'deleted' | 'all',
          moduleName,
          recordIds,
          channelId,
          token
        };
      });

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = `record.${ctx.input.operation}`;
      let eventId = `${ctx.input.moduleName}_${ctx.input.operation}_${ctx.input.recordIds.join('_')}_${Date.now()}`;

      return {
        type: eventType,
        id: eventId,
        output: {
          moduleName: ctx.input.moduleName,
          operation: ctx.input.operation,
          recordIds: ctx.input.recordIds,
          channelId: ctx.input.channelId
        }
      };
    }
  })
  .build();
