import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let agentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Agent Events',
  key: 'agent_events',
  description:
    'Receives webhook events for agent jobs — started, action performed, completed, failed, and cancelled. Configure the webhook URL when starting an agent job.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of agent event'),
      agentId: z.string().describe('ID of the agent job'),
      actionData: z
        .any()
        .optional()
        .describe('Data from the agent action for agent.action events'),
      extractedData: z.any().optional().describe('Extracted data for completed events'),
      error: z.string().optional().describe('Error message for failed events'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata from the agent job')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the agent job'),
      actionData: z.any().optional().describe('Data from the latest agent action'),
      extractedData: z.any().optional().describe('Data gathered by the agent'),
      error: z.string().optional().describe('Error message if the agent failed'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata from the agent job')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.type ?? 'unknown';

      return {
        inputs: [
          {
            eventType,
            agentId: body.id ?? '',
            actionData: eventType === 'agent.action' ? body.data : undefined,
            extractedData: eventType === 'agent.completed' ? body.data : undefined,
            error: body.error,
            metadata: body.metadata
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let uniqueId = `${ctx.input.agentId}-${ctx.input.eventType}`;
      if (ctx.input.eventType === 'agent.action') {
        uniqueId = `${ctx.input.agentId}-action-${Date.now()}`;
      }

      return {
        type: ctx.input.eventType,
        id: uniqueId,
        output: {
          agentId: ctx.input.agentId,
          actionData: ctx.input.actionData,
          extractedData: ctx.input.extractedData,
          error: ctx.input.error,
          metadata: ctx.input.metadata
        }
      };
    }
  });
