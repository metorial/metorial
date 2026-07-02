import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let accountEvents = SlateTrigger.create(spec, {
  name: 'Account Events',
  key: 'account_events',
  description: 'Triggers when an account is created, updated, or deleted in Outreach.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action that occurred (created, updated, destroyed)'),
      resourceId: z.string().describe('ID of the affected account'),
      resourceAttributes: z.record(z.string(), z.any()).describe('Account attributes'),
      relationships: z
        .record(z.string(), z.any())
        .optional()
        .describe('Related resource references'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      accountId: z.string(),
      name: z.string().optional(),
      domain: z.string().optional(),
      industry: z.string().optional(),
      locality: z.string().optional(),
      ownerId: z.string().optional(),
      tags: z.array(z.string()).optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resource: 'account',
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
        type: `account.${ctx.input.eventAction}`,
        id: `account-${ctx.input.resourceId}-${ctx.input.timestamp}`,
        output: {
          accountId: ctx.input.resourceId,
          name: attrs.name,
          domain: attrs.domain,
          industry: attrs.industry,
          locality: attrs.locality,
          ownerId: rels.owner?.data?.id?.toString(),
          tags: attrs.tags,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt
        }
      };
    }
  })
  .build();
