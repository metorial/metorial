import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let reminderEvents = SlateTrigger.create(spec, {
  name: 'Reminder Events',
  key: 'reminder_events',
  description: 'Triggers when a reminder is created, updated, or deleted in Affinity.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (reminder.created, reminder.updated, reminder.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      reminderId: z.number().describe('ID of the reminder'),
      ownerId: z.number().nullable().describe('ID of the reminder owner'),
      content: z.string().nullable().describe('Reminder text'),
      dueDate: z.string().nullable().describe('Due date'),
      personId: z.number().nullable().describe('Associated person ID'),
      organizationId: z.number().nullable().describe('Associated organization ID'),
      opportunityId: z.number().nullable().describe('Associated opportunity ID')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: ['reminder.created', 'reminder.updated', 'reminder.deleted']
      });
      return {
        registrationDetails: {
          webhookId: result.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let type = data.type as string;
      if (!type?.startsWith('reminder.')) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: type,
            eventId: `${type}-${data.body?.id ?? ''}-${data.sent_at ?? Date.now()}`,
            sentAt: data.sent_at ?? null,
            body: data.body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let body = ctx.input.body ?? {};

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          reminderId: body.id ?? 0,
          ownerId: body.owner_id ?? null,
          content: body.content ?? null,
          dueDate: body.due_date ?? null,
          personId: body.person_id ?? null,
          organizationId: body.organization_id ?? null,
          opportunityId: body.opportunity_id ?? null
        }
      };
    }
  })
  .build();
