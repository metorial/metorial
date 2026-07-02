import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { BookingmoodClient } from '../lib/client';
import { spec } from '../spec';

export let memberEvents = SlateTrigger.create(spec, {
  name: 'Member Events',
  key: 'member_events',
  description: 'Triggers when an organization member is created or updated.'
})
  .input(
    z.object({
      eventId: z.string().describe('Unique event ID'),
      eventType: z.string().describe('Event type: members.created or members.updated'),
      memberNew: z.any().describe('New member data'),
      memberOld: z.any().nullable().describe('Previous member data')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('UUID of the member'),
      organizationId: z.string().describe('UUID of the organization'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      let webhook = await client.createWebhook({
        endpoint: ctx.input.webhookBaseUrl,
        events: ['members.created', 'members.updated'],
        description: 'Slates: Member Events'
      });
      return { registrationDetails: { webhookId: webhook.id } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new BookingmoodClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();
      return {
        inputs: [
          {
            eventId: data.id,
            eventType: data.event_type,
            memberNew: data.payload?.new ?? null,
            memberOld: data.payload?.old ?? null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let member = ctx.input.memberNew;

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          memberId: member.id,
          organizationId: member.organization_id,
          createdAt: member.created_at,
          updatedAt: member.updated_at
        }
      };
    }
  })
  .build();
