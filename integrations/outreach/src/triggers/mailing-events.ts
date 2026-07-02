import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mailingEvents = SlateTrigger.create(spec, {
  name: 'Mailing Events',
  key: 'mailing_events',
  description:
    'Triggers on mailing events: created, updated, destroyed, bounced, delivered, opened, or replied.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe(
          'The action (created, updated, destroyed, bounced, delivered, opened, replied)'
        ),
      resourceId: z.string().describe('ID of the affected mailing'),
      resourceAttributes: z.record(z.string(), z.any()).describe('Mailing attributes'),
      relationships: z
        .record(z.string(), z.any())
        .optional()
        .describe('Related resource references'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      mailingId: z.string(),
      subject: z.string().optional(),
      prospectId: z.string().optional(),
      sequenceId: z.string().optional(),
      bouncedAt: z.string().optional(),
      deliveredAt: z.string().optional(),
      openedAt: z.string().optional(),
      repliedAt: z.string().optional(),
      openCount: z.number().optional(),
      clickCount: z.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resource: 'mailing',
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
        type: `mailing.${ctx.input.eventAction}`,
        id: `mailing-${ctx.input.resourceId}-${ctx.input.eventAction}-${ctx.input.timestamp}`,
        output: {
          mailingId: ctx.input.resourceId,
          subject: attrs.subject,
          prospectId: rels.prospect?.data?.id?.toString(),
          sequenceId: rels.sequence?.data?.id?.toString(),
          bouncedAt: attrs.bouncedAt,
          deliveredAt: attrs.deliveredAt,
          openedAt: attrs.openedAt,
          repliedAt: attrs.repliedAt,
          openCount: attrs.openCount,
          clickCount: attrs.clickCount,
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt
        }
      };
    }
  })
  .build();
