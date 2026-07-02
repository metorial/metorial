import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sequenceEvents = SlateTrigger.create(spec, {
  name: 'Sequence Events',
  key: 'sequence_events',
  description: 'Triggers when a sequence is created, updated, or deleted in Outreach.'
})
  .input(
    z.object({
      eventAction: z.string().describe('The action (created, updated, destroyed)'),
      resourceId: z.string().describe('ID of the affected sequence'),
      resourceAttributes: z.record(z.string(), z.any()).describe('Sequence attributes'),
      relationships: z
        .record(z.string(), z.any())
        .optional()
        .describe('Related resource references'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      sequenceId: z.string(),
      name: z.string().optional(),
      enabled: z.boolean().optional(),
      sequenceType: z.string().optional(),
      description: z.string().optional(),
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
        resource: 'sequence',
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
        type: `sequence.${ctx.input.eventAction}`,
        id: `sequence-${ctx.input.resourceId}-${ctx.input.timestamp}`,
        output: {
          sequenceId: ctx.input.resourceId,
          name: attrs.name,
          enabled: attrs.enabled,
          sequenceType: attrs.sequenceType,
          description: attrs.description,
          ownerId: rels.owner?.data?.id?.toString(),
          tags: attrs.tags,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt
        }
      };
    }
  })
  .build();
