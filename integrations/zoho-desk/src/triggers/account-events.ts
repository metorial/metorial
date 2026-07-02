import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let accountEventTypes = ['Account_Add', 'Account_Update', 'Account_Delete'] as const;

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description: 'Triggered when a company account is created, updated, or deleted.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of account event'),
      accountId: z.string().describe('ID of the affected account'),
      payload: z.any().describe('Full event payload from Zoho Desk')
    })
  )
  .output(
    z.object({
      accountId: z.string().describe('ID of the affected account'),
      accountName: z.string().optional().describe('Account name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      website: z.string().optional().describe('Website URL'),
      previousState: z.any().optional().describe('Previous state (for update events)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookIds: string[] = [];

      for (let eventType of accountEventTypes) {
        try {
          let webhookData: Record<string, any> = {
            name: `Slates - ${eventType}`,
            url: ctx.input.webhookBaseUrl,
            eventType,
            isActive: true
          };

          if (eventType === 'Account_Update') {
            webhookData.includePrevState = true;
          }

          let result = await client.createWebhook(webhookData);
          webhookIds.push(result.id);
        } catch {
          // Continue
        }
      }

      return { registrationDetails: { webhookIds } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details.webhookIds || []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          /* ignore */
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.input.request.json()) as Record<string, any>;

      let eventType = data.eventType || data.event_type || 'unknown';
      let account = data.payload || data.account || data;
      let accountId = account.id || account.accountId || data.accountId || '';

      return {
        inputs: [
          {
            eventType,
            accountId: String(accountId),
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, accountId, payload } = ctx.input;
      let account = payload?.payload || payload?.account || payload || {};

      let normalizedType = eventType
        .replace(/^Account_/, 'account.')
        .replace(/_/g, '_')
        .toLowerCase();

      return {
        type: normalizedType,
        id: `${accountId}-${eventType}-${payload?.eventTime || Date.now()}`,
        output: {
          accountId,
          accountName: account.accountName,
          email: account.email,
          phone: account.phone,
          website: account.website,
          previousState: account.prevState || payload?.prevState
        }
      };
    }
  })
  .build();
