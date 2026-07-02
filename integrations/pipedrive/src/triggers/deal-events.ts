import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let dealEvents = SlateTrigger.create(spec, {
  name: 'Deal Events',
  key: 'deal_events',
  description: 'Triggers when a deal is created, updated, or deleted in Pipedrive.'
})
  .input(
    z.object({
      action: z.enum(['created', 'changed', 'deleted']).describe('Event action type'),
      eventId: z.string().describe('Unique event identifier'),
      current: z.any().optional().describe('Current state of the deal'),
      previous: z.any().optional().describe('Previous state of the deal')
    })
  )
  .output(
    z.object({
      dealId: z.number().describe('Deal ID'),
      title: z.string().optional().describe('Deal title'),
      value: z.number().optional().describe('Deal value'),
      currency: z.string().optional().describe('Deal currency'),
      status: z.string().optional().describe('Deal status'),
      stageId: z.number().optional().describe('Stage ID'),
      pipelineId: z.number().optional().describe('Pipeline ID'),
      personId: z.number().optional().nullable().describe('Linked person ID'),
      organizationId: z.number().optional().nullable().describe('Linked organization ID'),
      userId: z.number().optional().describe('Owner user ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      stageChangeTime: z
        .string()
        .optional()
        .nullable()
        .describe('Last stage change timestamp'),
      previousStageId: z
        .number()
        .optional()
        .nullable()
        .describe('Previous stage ID (on stage change)')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let result = await client.createWebhook({
        subscription_url: ctx.input.webhookBaseUrl,
        event_action: '*',
        event_object: 'deal'
      });
      return {
        registrationDetails: {
          webhookId: result?.data?.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = createClient(ctx);
      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let action = data.meta?.action;
      let current = data.current;
      let previous = data.previous;

      let actionMap: Record<string, string> = {
        added: 'created',
        updated: 'changed',
        deleted: 'deleted',
        merged: 'changed'
      };

      let mappedAction = actionMap[action] || action;

      return {
        inputs: [
          {
            action: mappedAction,
            eventId: `deal-${current?.id || previous?.id}-${data.meta?.timestamp || Date.now()}`,
            current,
            previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let deal = ctx.input.current || ctx.input.previous || {};

      return {
        type: `deal.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          dealId: deal.id,
          title: deal.title,
          value: deal.value,
          currency: deal.currency,
          status: deal.status,
          stageId: deal.stage_id,
          pipelineId: deal.pipeline_id,
          personId: deal.person_id,
          organizationId: deal.org_id,
          userId: deal.user_id,
          addTime: deal.add_time,
          updateTime: deal.update_time,
          stageChangeTime: deal.stage_change_time,
          previousStageId: ctx.input.previous?.stage_id ?? null
        }
      };
    }
  });
