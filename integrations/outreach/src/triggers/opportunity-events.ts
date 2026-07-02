import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let opportunityEvents = SlateTrigger.create(spec, {
  name: 'Opportunity Events',
  key: 'opportunity_events',
  description: 'Triggers when an opportunity is created, updated, or deleted in Outreach.'
})
  .input(
    z.object({
      eventAction: z.string().describe('The action (created, updated, destroyed)'),
      resourceId: z.string().describe('ID of the affected opportunity'),
      resourceAttributes: z.record(z.string(), z.any()).describe('Opportunity attributes'),
      relationships: z
        .record(z.string(), z.any())
        .optional()
        .describe('Related resource references'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      opportunityId: z.string(),
      name: z.string().optional(),
      amount: z.number().optional(),
      probability: z.number().optional(),
      closeDate: z.string().optional(),
      stageName: z.string().optional(),
      accountId: z.string().optional(),
      ownerId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resource: 'opportunity',
        action: '*'
      });
      return {
        registrationDetails: { webhookId: webhook.id }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let data = body?.data;
      if (!data) return { inputs: [] };

      let meta = body?.meta ?? {};

      return {
        inputs: [
          {
            eventAction: meta.eventName?.split('.')?.[1] ?? 'unknown',
            resourceId: data.id?.toString() ?? '',
            resourceAttributes: data.attributes ?? {},
            relationships: data.relationships,
            timestamp: meta.deliveredAt ?? new Date().toISOString()
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let attrs = ctx.input.resourceAttributes as Record<string, any>;
      let rels = (ctx.input.relationships ?? {}) as Record<string, any>;

      return {
        type: `opportunity.${ctx.input.eventAction}`,
        id: `opportunity-${ctx.input.resourceId}-${ctx.input.timestamp}`,
        output: {
          opportunityId: ctx.input.resourceId,
          name: attrs.name,
          amount: attrs.amount,
          probability: attrs.probability,
          closeDate: attrs.closeDate,
          stageName: attrs.stageName,
          accountId: rels.account?.data?.id?.toString(),
          ownerId: rels.owner?.data?.id?.toString(),
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt
        }
      };
    }
  })
  .build();
