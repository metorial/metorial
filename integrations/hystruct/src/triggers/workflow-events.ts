import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let workflowEvents = SlateTrigger.create(spec, {
  name: 'Workflow Events',
  key: 'workflow_events',
  description:
    'Receive real-time notifications when events occur in Hystruct workflows, such as job completions or data updates.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of event that occurred.'),
      workflowId: z.string().describe('The ID of the workflow the event belongs to.'),
      eventPayload: z
        .record(z.string(), z.unknown())
        .describe('The full event payload from Hystruct.')
    })
  )
  .output(
    z.object({
      workflowId: z.string().describe('The ID of the workflow that triggered the event.'),
      eventType: z.string().describe('The type of event that occurred.'),
      eventPayload: z
        .record(z.string(), z.unknown())
        .describe('The full event payload from Hystruct.')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let result = await client.subscribeWebhook({
        workflowId: '',
        webhookUrl: ctx.input.webhookBaseUrl,
        events: []
      });

      return {
        registrationDetails: {
          webhookUrl: ctx.input.webhookBaseUrl,
          message: result.message
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let webhooksResponse = await client.listWebhooks();
      let webhook = webhooksResponse.webhooks.find(w => w.url === ctx.input.webhookBaseUrl);

      if (webhook) {
        await client.unsubscribeWebhook(webhook.webhookId);
      }
    },

    handleRequest: async ctx => {
      let body = (await ctx.input.request.json()) as Record<string, unknown>;

      let workflowId = (body.workflowId as string) || '';
      let eventType = (body.event as string) || (body.type as string) || 'unknown';

      return {
        inputs: [
          {
            eventType,
            workflowId,
            eventPayload: body as Record<string, unknown>
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `workflow.${ctx.input.eventType}`,
        id: `${ctx.input.workflowId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          workflowId: ctx.input.workflowId,
          eventType: ctx.input.eventType,
          eventPayload: ctx.input.eventPayload
        }
      };
    }
  })
  .build();
