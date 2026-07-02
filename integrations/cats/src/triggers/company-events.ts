import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let COMPANY_EVENTS = [
  'company.created',
  'company.updated',
  'company.deleted',
  'company.status_changed'
] as const;

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description:
    'Triggers when a company is created, updated, deleted, or has its status changed.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type'),
      companyId: z.string().describe('Company ID'),
      previousStatusId: z.string().optional().describe('Previous status ID'),
      newStatusId: z.string().optional().describe('New status ID'),
      rawPayload: z.any().optional().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      companyId: z.string().describe('Company ID'),
      name: z.string().optional().describe('Company name'),
      website: z.string().optional().describe('Website'),
      isHot: z.boolean().optional().describe('Whether hot'),
      previousStatusId: z.string().optional().describe('Previous status ID'),
      newStatusId: z.string().optional().describe('New status ID'),
      createdAt: z.string().optional().describe('Created date'),
      updatedAt: z.string().optional().describe('Updated date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhookIds: string[] = [];
      for (let event of COMPANY_EVENTS) {
        let result = await client.createWebhook({
          url: ctx.input.webhookBaseUrl,
          event
        });
        let webhookId =
          result?.id?.toString() ?? result?._links?.self?.href?.split('/').pop() ?? '';
        webhookIds.push(webhookId);
      }

      return {
        registrationDetails: { webhookIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookIds: string[] };

      for (let webhookId of details?.webhookIds ?? []) {
        try {
          await client.deleteWebhook(webhookId);
        } catch {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let companyId = data.company_id?.toString() ?? '';
      let eventType = data.event ?? '';

      return {
        inputs: [
          {
            eventType,
            companyId,
            previousStatusId: data.previous_status_id?.toString(),
            newStatusId: data.new_status_id?.toString(),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let company: any = {};
      if (ctx.input.eventType !== 'company.deleted') {
        try {
          company = await client.getCompany(ctx.input.companyId);
        } catch {
          // Company may not exist anymore
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}-${ctx.input.companyId}-${Date.now()}`,
        output: {
          companyId: ctx.input.companyId,
          name: company.name,
          website: company.website,
          isHot: company.is_hot,
          previousStatusId: ctx.input.previousStatusId,
          newStatusId: ctx.input.newStatusId,
          createdAt: company.created_at,
          updatedAt: company.updated_at
        }
      };
    }
  })
  .build();
