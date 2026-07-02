import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sequenceStateEvents = SlateTrigger.create(spec, {
  name: 'Sequence Enrollment Events',
  key: 'sequence_state_events',
  description:
    'Triggers on sequence enrollment events: created, updated, destroyed, advanced, or finished.'
})
  .input(
    z.object({
      eventAction: z
        .string()
        .describe('The action (created, updated, destroyed, advanced, finished)'),
      resourceId: z.string().describe('ID of the affected sequence state'),
      resourceAttributes: z.record(z.string(), z.any()).describe('Sequence state attributes'),
      relationships: z
        .record(z.string(), z.any())
        .optional()
        .describe('Related resource references'),
      timestamp: z.string().describe('When the event occurred')
    })
  )
  .output(
    z.object({
      sequenceStateId: z.string(),
      state: z.string().optional(),
      prospectId: z.string().optional(),
      sequenceId: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhook = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        resource: 'sequenceState',
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
        type: `sequence_state.${ctx.input.eventAction}`,
        id: `sequence-state-${ctx.input.resourceId}-${ctx.input.eventAction}-${ctx.input.timestamp}`,
        output: {
          sequenceStateId: ctx.input.resourceId,
          state: attrs.state,
          prospectId: rels.prospect?.data?.id?.toString(),
          sequenceId: rels.sequence?.data?.id?.toString(),
          createdAt: attrs.createdAt,
          updatedAt: attrs.updatedAt
        }
      };
    }
  })
  .build();
