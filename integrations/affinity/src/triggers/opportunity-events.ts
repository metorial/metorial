import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let opportunityEvents = SlateTrigger.create(spec, {
  name: 'Opportunity Events',
  key: 'opportunity_events',
  description:
    'Triggers when an opportunity (deal) is created, updated, or deleted in Affinity.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of event (e.g. opportunity.created, opportunity.updated, opportunity.deleted)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      opportunityId: z.number().describe('ID of the affected opportunity'),
      name: z.string().nullable().describe('Opportunity name'),
      listId: z.number().nullable().describe('ID of the list this opportunity belongs to'),
      personIds: z.array(z.number()).describe('Associated person IDs'),
      organizationIds: z.array(z.number()).describe('Associated organization IDs')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: ['opportunity.created', 'opportunity.updated', 'opportunity.deleted']
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
      if (!type?.startsWith('opportunity.')) {
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
          opportunityId: body.id ?? 0,
          name: body.name ?? null,
          listId: body.list_id ?? null,
          personIds: body.person_ids ?? [],
          organizationIds: body.organization_ids ?? []
        }
      };
    }
  })
  .build();
