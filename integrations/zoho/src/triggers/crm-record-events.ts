import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { ZohoCrmClient } from '../lib/client';
import type { Datacenter } from '../lib/urls';
import { spec } from '../spec';

export let crmRecordEvents = SlateTrigger.create(spec, {
  name: 'CRM Record Events',
  key: 'crm_record_events',
  description:
    'Triggers when CRM records are created, updated, or deleted in Zoho CRM. Uses the CRM Notification/Watch API to receive real-time push notifications.'
})
  .input(
    z.object({
      module: z.string().describe('CRM module name (e.g., Leads, Contacts, Deals)'),
      operation: z.string().describe('Operation type (insert, update, delete)'),
      recordIds: z.array(z.string()).describe('Affected record IDs'),
      channelId: z.string().describe('Notification channel ID'),
      token: z.string().optional().describe('Verification token'),
      serverTime: z.string().optional().describe('Server timestamp of the event'),
      affectedFields: z.record(z.string(), z.any()).optional().describe('Changed field values')
    })
  )
  .output(
    z.object({
      module: z.string().describe('CRM module name'),
      recordIds: z.array(z.string()).describe('Affected record IDs'),
      operation: z.string().describe('Operation performed (insert, update, delete)'),
      channelId: z.string().describe('Notification channel ID'),
      serverTime: z.string().optional().describe('Server timestamp'),
      affectedFields: z.record(z.string(), z.any()).optional().describe('Changed field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
      let client = new ZohoCrmClient({ token: ctx.auth.token, datacenter: dc });

      let channelId = `${Date.now()}`;

      // Subscribe to all events for major modules
      let modules = ['Leads', 'Contacts', 'Accounts', 'Deals', 'Tasks', 'Events', 'Calls'];
      let events = modules.flatMap(m => [`${m}.all`]);

      // Channel expiry max is 1 week
      let expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      let result = await client.enableNotifications([
        {
          channelId,
          events,
          notifyUrl: ctx.input.webhookBaseUrl,
          channelExpiry: expiry,
          returnAffectedFieldValues: true
        }
      ]);

      return {
        registrationDetails: {
          channelId,
          events,
          result
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let dc = (ctx.auth.datacenter || ctx.config.datacenter || 'us') as Datacenter;
      let client = new ZohoCrmClient({ token: ctx.auth.token, datacenter: dc });

      let channelId = ctx.input.registrationDetails?.channelId;
      if (channelId) {
        await client.disableNotifications([channelId]);
      }
    },

    handleRequest: async ctx => {
      let body: any = await ctx.request.json();

      // Zoho CRM sends notifications as a JSON body with module, operation, ids, etc.
      let inputs: Array<{
        module: string;
        operation: string;
        recordIds: string[];
        channelId: string;
        token?: string;
        serverTime?: string;
        affectedFields?: Record<string, any>;
      }> = [];

      // The body can be a single notification or contain query_map
      if (body?.module) {
        inputs.push({
          module: body.module,
          operation: body.operation || 'unknown',
          recordIds: body.ids || [],
          channelId: body.channel_id?.toString() || '',
          token: body.token,
          serverTime: body.server_time,
          affectedFields: body.affected_fields
        });
      } else if (body?.query_map) {
        // Some CRM webhooks send via query_map format
        let qm =
          typeof body.query_map === 'string' ? JSON.parse(body.query_map) : body.query_map;
        inputs.push({
          module: qm.module || '',
          operation: qm.operation || 'unknown',
          recordIds: qm.ids || [],
          channelId: qm.channel_id?.toString() || '',
          token: qm.token,
          serverTime: qm.server_time,
          affectedFields: qm.affected_fields
        });
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let operationMap: Record<string, string> = {
        insert: 'created',
        update: 'updated',
        delete: 'deleted'
      };

      let eventType = operationMap[ctx.input.operation] || ctx.input.operation;

      return {
        type: `crm.${ctx.input.module.toLowerCase()}.${eventType}`,
        id: `${ctx.input.channelId}-${ctx.input.module}-${ctx.input.operation}-${ctx.input.recordIds.join(',')}`,
        output: {
          module: ctx.input.module,
          recordIds: ctx.input.recordIds,
          operation: ctx.input.operation,
          channelId: ctx.input.channelId,
          serverTime: ctx.input.serverTime,
          affectedFields: ctx.input.affectedFields
        }
      };
    }
  })
  .build();
