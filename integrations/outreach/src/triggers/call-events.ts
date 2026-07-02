import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let callEvents = SlateTrigger.create(spec, {
  name: 'Call Events',
  key: 'call_events',
  description: 'Triggers when a call is created, updated, or deleted in Outreach.'
})
  .input(
    z.object({
      eventAction: z.string().describe('The action (created, updated, destroyed)'),
      resourceId: z.string().describe('ID of the affected call'),
      resourceAttributes: z.record(z.string(), z.any()).describe('Call attributes'),
      relationships: z
        .record(z.string(), z.any())
        .optional()
        .describe('Related resource references'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      callId: z.string(),
      direction: z.string().optional(),
      disposition: z.string().optional(),
      note: z.string().optional(),
      dialedAt: z.string().optional(),
      answeredAt: z.string().optional(),
      completedAt: z.string().optional(),
      prospectId: z.string().optional(),
      userId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resource: 'call',
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
        type: `call.${ctx.input.eventAction}`,
        id: `call-${ctx.input.resourceId}-${ctx.input.eventAction}-${ctx.input.timestamp}`,
        output: {
          callId: ctx.input.resourceId,
          direction: attrs.direction,
          disposition: attrs.disposition,
          note: attrs.note,
          dialedAt: attrs.dialedAt,
          answeredAt: attrs.answeredAt,
          completedAt: attrs.completedAt,
          prospectId: rels.prospect?.data?.id?.toString(),
          userId: rels.user?.data?.id?.toString(),
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt
        }
      };
    }
  })
  .build();
