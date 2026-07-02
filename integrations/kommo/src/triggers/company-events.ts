import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { KommoClient } from '../lib/client';
import { spec } from '../spec';

let COMPANY_WEBHOOK_SETTINGS = [
  'add_company',
  'update_company',
  'delete_company',
  'restore_company',
  'responsible_company',
  'note_company'
];

export let companyEventsTrigger = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description:
    'Triggers when a company is added, updated, deleted, restored, changes responsible user, or receives a note.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of company event'),
      companyId: z.number().describe('Company ID'),
      companyName: z.string().optional().describe('Company name'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      createdAt: z.number().optional().describe('Company creation timestamp'),
      updatedAt: z.number().optional().describe('Company update timestamp'),
      accountId: z.number().optional().describe('Account ID'),
      customFields: z.any().optional().describe('Custom field values')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('Company ID'),
      companyName: z.string().optional().describe('Company name'),
      responsibleUserId: z.number().optional().describe('Responsible user ID'),
      createdAt: z.number().optional().describe('Company creation timestamp'),
      updatedAt: z.number().optional().describe('Company update timestamp'),
      accountId: z.number().optional().describe('Account ID'),
      customFields: z.any().optional().describe('Custom field values')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new KommoClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let webhookUrl = ctx.input.webhookBaseUrl;
      await client.createWebhook(webhookUrl, COMPANY_WEBHOOK_SETTINGS);

      return {
        registrationDetails: { destination: webhookUrl, settings: COMPANY_WEBHOOK_SETTINGS }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new KommoClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      await client.deleteWebhook(ctx.input.registrationDetails.destination);
    },

    handleRequest: async ctx => {
      let body: any;
      try {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        let jsonStr = params.get('') || text;
        body = JSON.parse(jsonStr);
      } catch {
        try {
          body = await ctx.request.json();
        } catch {
          return { inputs: [] };
        }
      }

      let inputs: any[] = [];

      let eventTypes: Record<string, string> = {
        add_company: 'company.added',
        update_company: 'company.updated',
        delete_company: 'company.deleted',
        restore_company: 'company.restored',
        responsible_company: 'company.responsible_changed',
        note_company: 'company.note_added'
      };

      for (let [webhookKey, eventType] of Object.entries(eventTypes)) {
        let eventData = body[webhookKey];
        if (!eventData) continue;

        let items = Array.isArray(eventData) ? eventData : [eventData];
        for (let item of items) {
          inputs.push({
            eventType,
            companyId: Number(item.id),
            companyName: item.name,
            responsibleUserId:
              item.responsible_user_id != null ? Number(item.responsible_user_id) : undefined,
            createdAt: item.created_at != null ? Number(item.created_at) : undefined,
            updatedAt: item.updated_at != null ? Number(item.updated_at) : undefined,
            accountId: body.account_id != null ? Number(body.account_id) : undefined,
            customFields: item.custom_fields
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.companyId}-${ctx.input.updatedAt || Date.now()}`,
        output: {
          companyId: ctx.input.companyId,
          companyName: ctx.input.companyName,
          responsibleUserId: ctx.input.responsibleUserId,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt,
          accountId: ctx.input.accountId,
          customFields: ctx.input.customFields
        }
      };
    }
  })
  .build();
