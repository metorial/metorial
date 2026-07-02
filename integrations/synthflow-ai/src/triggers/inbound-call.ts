import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let inboundCallWebhook = SlateTrigger.create(spec, {
  name: 'Inbound Call Webhook',
  key: 'inbound_call_webhook',
  description:
    'Receives notifications when an inbound call is initiated. Fires within 10 seconds of a call starting. Configure the inbound call webhook URL in your Synthflow agent settings.'
})
  .input(
    z.object({
      event: z.string().optional().describe('Event type (call_inbound)'),
      callId: z.string().optional().describe('Unique call identifier'),
      callerPhone: z.string().optional().describe('Caller phone number'),
      calledNumber: z.string().optional().describe('Called phone number'),
      agentId: z.string().optional().describe('Agent model ID assigned to handle the call'),
      raw: z.record(z.string(), z.any()).optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('Unique call identifier'),
      callerPhone: z.string().optional().describe('Caller phone number'),
      calledNumber: z.string().optional().describe('Called phone number'),
      agentId: z.string().optional().describe('Agent model ID assigned to handle the call')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let input = {
        event: data.event || 'call_inbound',
        callId: data.call_id || data.id,
        callerPhone: data.caller_phone || data.from,
        calledNumber: data.called_number || data.to,
        agentId: data.agent_id || data.model_id,
        raw: data
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let callId = ctx.input.callId || `inbound_${Date.now()}`;

      return {
        type: 'call.inbound',
        id: callId,
        output: {
          callId: ctx.input.callId,
          callerPhone: ctx.input.callerPhone,
          calledNumber: ctx.input.calledNumber,
          agentId: ctx.input.agentId
        }
      };
    }
  })
  .build();
