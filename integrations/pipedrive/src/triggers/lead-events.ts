import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let leadEvents = SlateTrigger.create(spec, {
  name: 'Lead Events',
  key: 'lead_events',
  description: 'Triggers when a lead is created, updated, or deleted in Pipedrive.'
})
  .input(
    z.object({
      action: z.enum(['created', 'changed', 'deleted']).describe('Event action type'),
      eventId: z.string().describe('Unique event identifier'),
      current: z.any().optional().describe('Current state of the lead'),
      previous: z.any().optional().describe('Previous state of the lead')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Lead ID'),
      title: z.string().optional().describe('Lead title'),
      personId: z.number().optional().nullable().describe('Linked person ID'),
      organizationId: z.number().optional().nullable().describe('Linked organization ID'),
      isArchived: z.boolean().optional().describe('Whether the lead is archived'),
      userId: z.number().optional().describe('Owner user ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      value: z
        .object({
          amount: z.number(),
          currency: z.string()
        })
        .optional()
        .nullable()
        .describe('Lead value')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let result = await client.createWebhook({
        subscription_url: ctx.input.webhookBaseUrl,
        event_action: '*',
        event_object: 'lead'
      });
      return {
        registrationDetails: { webhookId: result?.data?.id }
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
        deleted: 'deleted'
      };

      return {
        inputs: [
          {
            action: actionMap[action] || action,
            eventId: `lead-${current?.id || previous?.id}-${data.meta?.timestamp || Date.now()}`,
            current,
            previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let lead = ctx.input.current || ctx.input.previous || {};

      return {
        type: `lead.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          leadId: lead.id,
          title: lead.title,
          personId: lead.person_id,
          organizationId: lead.organization_id,
          isArchived: lead.is_archived,
          userId: lead.owner_id ?? lead.creator_id,
          addTime: lead.add_time,
          updateTime: lead.update_time,
          value: lead.value
        }
      };
    }
  });
