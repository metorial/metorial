import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let dealEvents = SlateTrigger.create(spec, {
  name: 'Deal Events',
  key: 'deal_events',
  description: 'Triggers when a deal is created, updated, or deleted in CentralStationCRM.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action that triggered the event (create, update, destroy)'),
      dealId: z.number().describe('ID of the affected deal'),
      dealName: z.string().optional().describe('Name of the deal'),
      rawPayload: z.any().describe('Complete webhook payload')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('ID of the deal'),
      dealName: z.string().optional().describe('Name of the deal'),
      value: z.string().optional().describe('Monetary value'),
      valueType: z.string().optional().describe('Billing type'),
      targetDate: z.string().optional().describe('Target date'),
      currentState: z.string().optional().describe('Current deal state'),
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
        object_type: 'Deal',
        action: 'create'
      });

      let updateHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/update`,
        object_type: 'Deal',
        action: 'update'
      });

      let deleteHook = await client.createWebhook({
        url: `${ctx.input.webhookBaseUrl}/destroy`,
        object_type: 'Deal',
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

      let deal = data?.deal ?? data;

      return {
        inputs: [
          {
            eventAction: actionFromPath,
            dealId: deal?.id ?? 0,
            dealName: deal?.name,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let deal = ctx.input.rawPayload?.deal ?? ctx.input.rawPayload;

      return {
        type: `deal.${ctx.input.eventAction === 'destroy' ? 'deleted' : ctx.input.eventAction === 'create' ? 'created' : 'updated'}`,
        id: `deal_${ctx.input.dealId}_${ctx.input.eventAction}_${Date.now()}`,
        output: {
          dealId: ctx.input.dealId,
          dealName: deal?.name ?? ctx.input.dealName,
          value: deal?.value,
          valueType: deal?.value_type,
          targetDate: deal?.target_date,
          currentState: deal?.current_state,
          createdAt: deal?.created_at,
          updatedAt: deal?.updated_at
        }
      };
    }
  })
  .build();
