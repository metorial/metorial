import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let transferEvents = SlateTrigger.create(spec, {
  name: 'Transfer Events',
  key: 'transfer_events',
  description:
    'Triggered on call transfer events: transfer started, bridged, cancelled, and ended. Configure the webhook URL in Retell AI dashboard or on the agent.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of transfer event (transfer_started, transfer_bridged, transfer_cancelled, transfer_ended)'
        ),
      callId: z.string().describe('Unique identifier of the call'),
      transferDestination: z
        .string()
        .optional()
        .describe('Transfer destination number or SIP URI'),
      transferOptions: z
        .any()
        .optional()
        .describe('Transfer options (warm/cold transfer, etc.)'),
      agentId: z.string().optional().describe('Agent ID'),
      metadata: z.any().optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique identifier of the call'),
      transferDestination: z.string().optional().describe('Transfer destination'),
      transferOptions: z.any().optional().describe('Transfer options'),
      agentId: z.string().optional().describe('Agent ID'),
      metadata: z.any().optional().describe('Custom metadata')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event;
      let callData = body.call || body.data || body;

      return {
        inputs: [
          {
            eventType: eventType,
            callId: callData.call_id || '',
            transferDestination: callData.transfer_destination,
            transferOptions: callData.transfer_options,
            agentId: callData.agent_id,
            metadata: callData.metadata
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `transfer.${ctx.input.eventType}`,
        id: `${ctx.input.callId}-${ctx.input.eventType}`,
        output: {
          callId: ctx.input.callId,
          transferDestination: ctx.input.transferDestination,
          transferOptions: ctx.input.transferOptions,
          agentId: ctx.input.agentId,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
