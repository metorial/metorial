import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let voiceCallReport = SlateTrigger.create(spec, {
  name: 'Voice Call Report',
  key: 'voice_call_report',
  description:
    'Receive delivery reports for outbound and inbound voice calls including success/failure status, caller ID, agent info, call direction, and failure reasons. Configure the webhook URL in the MSG91 dashboard.'
})
  .input(
    z.object({
      callId: z.string().optional().describe('Voice call ID'),
      callerId: z.string().optional().describe('Caller ID number'),
      recipientNumber: z.string().optional().describe('Called number'),
      status: z.string().optional().describe('Call status'),
      direction: z.string().optional().describe('Call direction: inbound or outbound'),
      duration: z.number().optional().describe('Call duration in seconds'),
      failureReason: z.string().optional().describe('Failure reason if call failed'),
      agentId: z.string().optional().describe('Agent ID if applicable'),
      extra: z.any().optional().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('Voice call ID'),
      callerId: z.string().optional().describe('Caller ID number'),
      recipientNumber: z.string().optional().describe('Called number'),
      status: z.string().optional().describe('Call status'),
      direction: z.string().optional().describe('Call direction'),
      duration: z.number().optional().describe('Call duration in seconds'),
      failureReason: z.string().optional().describe('Failure reason'),
      agentId: z.string().optional().describe('Agent ID')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map((event: any) => ({
          callId: event.callId || event.call_id || event.id || undefined,
          callerId: event.callerId || event.caller_id || undefined,
          recipientNumber: event.number || event.destination || event.to || undefined,
          status: event.status || undefined,
          direction: event.direction || undefined,
          duration: event.duration ? Number(event.duration) : undefined,
          failureReason:
            event.failure_reason || event.failureReason || event.reason || undefined,
          agentId: event.agent_id || event.agentId || undefined,
          extra: event
        }))
      };
    },

    handleEvent: async ctx => {
      let status = (ctx.input.status || 'unknown').toLowerCase();

      return {
        type: `voice_call.${status}`,
        id: `${ctx.input.callId || ''}-${status}-${Date.now()}`,
        output: {
          callId: ctx.input.callId,
          callerId: ctx.input.callerId,
          recipientNumber: ctx.input.recipientNumber,
          status: ctx.input.status,
          direction: ctx.input.direction,
          duration: ctx.input.duration,
          failureReason: ctx.input.failureReason,
          agentId: ctx.input.agentId
        }
      };
    }
  })
  .build();
