import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let changeSchema = z.object({
  path: z.array(z.string()).describe('Attribute path that changed'),
  type: z.enum(['add', 'remove', 'set']).describe('Type of change'),
  value: z.unknown().optional().describe('New value')
});

export let dealEvents = SlateTrigger.create(spec, {
  name: 'Deal Events',
  key: 'deal_events',
  description:
    'Triggers when a deal (object) is created, updated, or deleted in your Folk workspace.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of deal event'),
      eventId: z.string().describe('Unique event ID'),
      dealId: z.string().describe('ID of the affected deal'),
      dealUrl: z.string().describe('API URL to fetch deal details'),
      changes: z.array(changeSchema).optional().describe('Changes made (for update events)'),
      details: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Additional details (for delete events)'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .output(
    z.object({
      dealId: z.string().describe('ID of the affected deal'),
      dealUrl: z.string().describe('API URL for the deal'),
      name: z.string().optional().describe('Deal name (when available)'),
      changes: z.array(changeSchema).optional().describe('Specific changes made'),
      createdAt: z.string().describe('Event timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let { Client } = await import('../lib/client');
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        name: 'Slates - Deal Events',
        targetUrl: ctx.input.webhookBaseUrl,
        subscribedEvents: [
          { eventType: 'object.created' },
          { eventType: 'object.updated' },
          { eventType: 'object.deleted' }
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          signingSecret: webhook.signingSecret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let { Client } = await import('../lib/client');
      let client = new Client({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as Record<string, unknown>;

      let data = body.data as Record<string, unknown> | undefined;
      let eventType = body.type as string;

      // Map object.* events to deal.* for clearer typing
      let mappedType = eventType.replace('object.', 'deal.');

      return {
        inputs: [
          {
            eventType: mappedType,
            eventId: body.id as string,
            dealId: (data?.id as string) ?? '',
            dealUrl: (data?.url as string) ?? '',
            changes:
              (data?.changes as Array<{
                path: string[];
                type: 'add' | 'remove' | 'set';
                value?: unknown;
              }>) ?? undefined,
            details: (data?.details as Record<string, unknown>) ?? undefined,
            createdAt: body.createdAt as string
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let output: Record<string, unknown> = {
        dealId: ctx.input.dealId,
        dealUrl: ctx.input.dealUrl,
        createdAt: ctx.input.createdAt
      };

      if (ctx.input.changes) {
        output.changes = ctx.input.changes;
      }

      if (ctx.input.details) {
        let details = ctx.input.details;
        if (details.name) output.name = details.name;
      }

      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: output as {
          dealId: string;
          dealUrl: string;
          createdAt: string;
          name?: string;
          changes?: Array<{ path: string[]; type: 'add' | 'remove' | 'set'; value?: unknown }>;
        }
      };
    }
  })
  .build();
