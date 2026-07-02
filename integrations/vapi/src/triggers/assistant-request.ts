import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let assistantRequest = SlateTrigger.create(spec, {
  name: 'Assistant Request',
  key: 'assistant_request',
  description:
    'Triggers when Vapi requests an assistant configuration for an inbound phone call. This occurs when a phone number does not have a pre-assigned assistant. Configure the webhook URL as the Server URL on your Vapi phone number or account settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (assistant-request)'),
      callId: z.string().optional().describe('ID of the inbound call'),
      phoneNumber: z.string().optional().describe('Called phone number'),
      callerNumber: z.string().optional().describe('Caller phone number'),
      timestamp: z.string().optional().describe('Timestamp of the request'),
      rawPayload: z.any().describe('Raw event payload from Vapi')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('ID of the inbound call'),
      phoneNumber: z.string().optional().describe('Called phone number'),
      callerNumber: z.string().optional().describe('Caller phone number'),
      callType: z.string().optional().describe('Call type')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let message = data.message || data;

      if (message.type !== 'assistant-request') {
        return { inputs: [] };
      }

      let call = message.call || {};

      return {
        inputs: [
          {
            eventType: 'assistant-request',
            callId: call.id,
            phoneNumber: call.phoneNumber?.number || message.phoneNumber,
            callerNumber: call.customer?.number || message.customer?.number,
            timestamp: message.timestamp || new Date().toISOString(),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'call.assistant_request',
        id: `${ctx.input.callId || 'unknown'}-assistant-request-${ctx.input.timestamp || Date.now()}`,
        output: {
          callId: ctx.input.callId,
          phoneNumber: ctx.input.phoneNumber,
          callerNumber: ctx.input.callerNumber,
          callType: 'inboundPhoneCall'
        }
      };
    }
  })
  .build();
