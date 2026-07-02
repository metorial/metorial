import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let postCallWebhook = SlateTrigger.create(spec, {
  name: 'Post-Call Webhook',
  key: 'post_call_webhook',
  description:
    'Receives real-time notifications when a call is completed. Configure the webhook URL in your Synthflow agent or per-call API request using the external_webhook_url parameter.'
})
  .input(
    z.object({
      callId: z.string().optional().describe('Unique call identifier'),
      callStatus: z
        .string()
        .optional()
        .describe('Call status (completed, busy, failed, no-answer, etc.)'),
      endCallReason: z.string().optional().describe('Reason the call ended'),
      transcript: z.string().optional().describe('Full call transcript'),
      recordingUrl: z.string().optional().describe('URL to the call recording'),
      leadName: z.string().optional().describe('Lead name'),
      leadPhone: z.string().optional().describe('Lead phone number'),
      leadEmail: z.string().optional().describe('Lead email'),
      collectedVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Variables collected during the conversation'),
      actionResults: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Results from executed custom actions'),
      raw: z.record(z.string(), z.any()).optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('Unique call identifier'),
      callStatus: z.string().optional().describe('Call completion status'),
      endCallReason: z.string().optional().describe('Reason the call ended'),
      transcript: z.string().optional().describe('Full call transcript'),
      recordingUrl: z.string().optional().describe('URL to the call recording'),
      leadName: z.string().optional().describe('Lead name'),
      leadPhone: z.string().optional().describe('Lead phone number'),
      leadEmail: z.string().optional().describe('Lead email'),
      collectedVariables: z
        .record(z.string(), z.any())
        .optional()
        .describe('Variables collected from conversation flows'),
      actionResults: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Results from executed custom actions')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;

      let input = {
        callId: data.call_id || data.id,
        callStatus: data.call_status || data.status,
        endCallReason: data.end_call_reason,
        transcript: data.transcript,
        recordingUrl: data.recording_url,
        leadName: data.lead_name || data.name,
        leadPhone: data.lead_phone || data.phone,
        leadEmail: data.lead_email || data.email,
        collectedVariables: data.collected_variables || data.slots,
        actionResults: data.action_results || data.executed_actions,
        raw: data
      };

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let callId = ctx.input.callId || `call_${Date.now()}`;
      let status = ctx.input.callStatus || 'unknown';

      return {
        type: `call.${status}`,
        id: callId,
        output: {
          callId: ctx.input.callId,
          callStatus: ctx.input.callStatus,
          endCallReason: ctx.input.endCallReason,
          transcript: ctx.input.transcript,
          recordingUrl: ctx.input.recordingUrl,
          leadName: ctx.input.leadName,
          leadPhone: ctx.input.leadPhone,
          leadEmail: ctx.input.leadEmail,
          collectedVariables: ctx.input.collectedVariables,
          actionResults: ctx.input.actionResults
        }
      };
    }
  })
  .build();
