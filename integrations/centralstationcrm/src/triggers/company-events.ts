import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let companyEvents = SlateTrigger.create(spec, {
  name: 'Company Events',
  key: 'company_events',
  description: 'Triggers when a company is created, updated, or deleted in CentralStationCRM.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action that triggered the event (create, update, destroy)'),
      companyId: z.number().describe('ID of the affected company'),
      companyName: z.string().optional().describe('Name of the company'),
      rawPayload: z.any().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      companyId: z.number().describe('ID of the company'),
      companyName: z.string().optional().describe('Name of the company'),
      background: z.string().optional().describe('Background information'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let createHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/create`,
        object_type: 'Company',
        action: 'create'
      });

      let updateHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/update`,
        object_type: 'Company',
        action: 'update'
      });

      let deleteHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/destroy`,
        object_type: 'Company',
        action: 'destroy'
      });

      return {
        registrationDetails: {
          createHookId: (createHook?.hook ?? createHook)?.id,
          updateHookId: (updateHook?.hook ?? updateHook)?.id,
          deleteHookId: (deleteHook?.hook ?? deleteHook)?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        accountName: ctx.config.accountName
      });

      let details = ctx.input.registrationDetails as Record<string, number>;
      if (details.createHookId) await client.deleteWebhook(details.createHookId);
      if (details.updateHookId) await client.deleteWebhook(details.updateHookId);
      if (details.deleteHookId) await client.deleteWebhook(details.deleteHookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let url = new URL(ctx.request.url);
      let pathParts = url.pathname.split('/');
      let actionFromPath = pathParts[pathParts.length - 1] ?? 'unknown';

      let company = data?.company ?? data;

      return {
        inputs: [
          {
            eventAction: actionFromPath,
            companyId: company?.id ?? 0,
            companyName: company?.name,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let company = ctx.input.rawPayload?.company ?? ctx.input.rawPayload;

      return {
        type: `company.${ctx.input.eventAction === 'destroy' ? 'deleted' : ctx.input.eventAction === 'create' ? 'created' : 'updated'}`,
        id: `company_${ctx.input.companyId}_${ctx.input.eventAction}_${Date.now()}`,
        output: {
          companyId: ctx.input.companyId,
          companyName: company?.name ?? ctx.input.companyName,
          background: company?.background,
          createdAt: company?.created_at,
          updatedAt: company?.updated_at
        }
      };
    }
  })
  .build();
