import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let workflowEvent = SlateTrigger.create(spec, {
  name: 'Workflow Event',
  key: 'workflow_event',
  description:
    'Receives webhook events sent from Appsmith workflows. Configure an Appsmith workflow to make an HTTP POST request to the provided webhook URL to trigger this event. The workflow can send any JSON payload which will be forwarded as the event data.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Event type identifier from the payload, or "workflow.triggered" if not specified.'
        ),
      eventId: z.string().describe('Unique event identifier for deduplication.'),
      workflowId: z
        .string()
        .optional()
        .describe('Appsmith workflow ID, if included in the payload.'),
      workflowName: z
        .string()
        .optional()
        .describe('Appsmith workflow name, if included in the payload.'),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('The full JSON payload sent by the workflow.'),
      receivedAt: z.string().describe('Timestamp when the event was received.')
    })
  )
  .output(
    z.object({
      workflowId: z
        .string()
        .optional()
        .describe('The Appsmith workflow ID that sent this event.'),
      workflowName: z
        .string()
        .optional()
        .describe('The Appsmith workflow name that sent this event.'),
      eventType: z.string().describe('The type of event that occurred.'),
      payload: z
        .record(z.string(), z.any())
        .optional()
        .describe('The full event payload data.'),
      receivedAt: z.string().describe('Timestamp when the event was received.')
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

      let receivedAt = new Date().toISOString();
      let eventType = body?.eventType ?? body?.event ?? body?.type ?? 'workflow.triggered';
      let workflowId = body?.workflowId ?? body?.workflow_id;
      let workflowName = body?.workflowName ?? body?.workflow_name;
      let eventId =
        body?.eventId ??
        body?.event_id ??
        `${eventType}-${workflowId ?? 'unknown'}-${receivedAt}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            workflowId,
            workflowName,
            payload: body,
            receivedAt
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: ctx.input.eventType,
        id: ctx.input.eventId,
        output: {
          workflowId: ctx.input.workflowId,
          workflowName: ctx.input.workflowName,
          eventType: ctx.input.eventType,
          payload: ctx.input.payload,
          receivedAt: ctx.input.receivedAt
        }
      };
    }
  })
  .build();
