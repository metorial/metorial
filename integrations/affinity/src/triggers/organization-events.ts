import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { AffinityClient } from '../lib/client';
import { spec } from '../spec';

export let organizationEvents = SlateTrigger.create(spec, {
  name: 'Organization Events',
  key: 'organization_events',
  description:
    'Triggers when an organization record is created, updated, deleted, or merged in Affinity.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of event (e.g. organization.created, organization.updated, organization.deleted, organization.merged)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      sentAt: z.string().nullable().describe('When the event was sent'),
      body: z.any().describe('Raw event payload')
    })
  )
  .output(
    z.object({
      organizationId: z.number().describe('ID of the affected organization'),
      name: z.string().nullable().describe('Organization name'),
      domain: z.string().nullable().describe('Primary domain'),
      domains: z.array(z.string()).describe('All domains'),
      global: z.boolean().describe('Whether this is a global organization'),
      personIds: z.array(z.number()).describe('Associated person IDs')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new AffinityClient(ctx.auth.token);
      let result = await client.createWebhook({
        webhookUrl: ctx.input.webhookBaseUrl,
        subscriptions: [
          'organization.created',
          'organization.updated',
          'organization.deleted',
          'organization.merged'
        ]
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
      if (!type?.startsWith('organization.')) {
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
          organizationId: body.id ?? 0,
          name: body.name ?? null,
          domain: body.domain ?? null,
          domains: body.domains ?? [],
          global: body.global ?? false,
          personIds: body.person_ids ?? []
        }
      };
    }
  })
  .build();
