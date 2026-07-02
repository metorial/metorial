import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let organizationEvents = SlateTrigger.create(spec, {
  name: 'Organization Events',
  key: 'organization_events',
  description: 'Triggers when an organization is created, updated, or deleted in Pipedrive.'
})
  .input(
    z.object({
      action: z.enum(['created', 'changed', 'deleted']).describe('Event action type'),
      eventId: z.string().describe('Unique event identifier'),
      current: z.any().optional().describe('Current state of the organization'),
      previous: z.any().optional().describe('Previous state of the organization')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('Organization ID'),
      name: z.string().optional().describe('Organization name'),
      address: z.string().optional().nullable().describe('Organization address'),
      userId: z.number().optional().describe('Owner user ID'),
      addTime: z.string().optional().describe('Creation timestamp'),
      updateTime: z.string().optional().nullable().describe('Last update timestamp'),
      openDealsCount: z.number().optional().describe('Number of open deals'),
      peopleCount: z.number().optional().describe('Number of linked persons')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = createClient(ctx);
      let result = await client.createWebhook({
        subscription_url: ctx.input.webhookBaseUrl,
        event_action: '*',
        event_object: 'organization'
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
        deleted: 'deleted',
        merged: 'changed'
      };

      return {
        inputs: [
          {
            action: actionMap[action] || action,
            eventId: `organization-${current?.id || previous?.id}-${data.meta?.timestamp || Date.now()}`,
            current,
            previous
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let org = ctx.input.current || ctx.input.previous || {};

      return {
        type: `organization.${ctx.input.action}`,
        id: ctx.input.eventId,
        output: {
          organizationId: org.id,
          name: org.name,
          address: org.address,
          userId: org.owner_id,
          addTime: org.add_time,
          updateTime: org.update_time,
          openDealsCount: org.open_deals_count,
          peopleCount: org.people_count
        }
      };
    }
  });
