import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let personEvents = SlateTrigger.create(spec, {
  name: 'Person Events',
  key: 'person_events',
  description: 'Triggers when a person record is created, updated, or deleted in Affinity.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe('Type of event (e.g. person.created, person.updated, person.deleted)'),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the affected person'),
      firstName: z.string().nullable().describe('First name'),
      lastName: z.string().nullable().describe('Last name'),
      primaryEmail: z.string().nullable().describe('Primary email address'),
      emails: z.array(z.string()).describe('All email addresses'),
      organizationIds: z.array(z.number()).describe('Associated organization IDs')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: ['person.created', 'person.updated', 'person.deleted']
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
      if (!type?.startsWith('person.')) {
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
          personId: body.id ?? 0,
          firstName: body.first_name ?? null,
          lastName: body.last_name ?? null,
          primaryEmail: body.primary_email ?? null,
          emails: body.emails ?? [],
          organizationIds: body.organization_ids ?? []
        }
      };
    }
  })
  .build();
