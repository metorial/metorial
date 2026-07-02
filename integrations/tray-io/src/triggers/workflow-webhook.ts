import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let workflowWebhook = SlateTrigger.create(spec, {
  name: 'Workflow Webhook',
  key: 'workflow_webhook',
  description:
    'Receives incoming webhook events from Tray.io workflows. Configure a Tray.io workflow to send HTTP POST requests to the provided webhook URL when workflow events occur.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of the event (extracted from payload or defaulting to "workflow.event")'
        ),
      eventId: z.string().describe('Unique identifier for this event'),
      workflowPayload: z
        .record(z.string(), z.any())
        .describe('Full payload sent by the Tray.io workflow')
    })
  )
  .output(
    z.object({
      eventType: z.string().describe('Type of the event'),
      workflowPayload: z
        .record(z.string(), z.any())
        .describe('Full payload from the Tray.io workflow')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        body = {};
      }

      let eventType = body.event_type || body.eventType || body.type || 'workflow.event';
      let eventId =
        body.event_id ||
        body.eventId ||
        body.id ||
        `wh_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      return {
        inputs: [
          {
            eventType: String(eventType),
            eventId: String(eventId),
            workflowPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          workflowPayload: ctx.input.workflowPayload
        }
      };
    }
  })
  .build();
