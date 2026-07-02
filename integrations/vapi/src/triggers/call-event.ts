import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let callEvent = SlateTrigger.create(spec, {
  name: 'Call Event',
  key: 'call_event',
  description:
    'Triggers on Vapi call lifecycle events including status changes, end-of-call reports, transcripts, speech updates, transfer updates, and hang notifications. Configure the webhook URL as the Server URL on your Vapi assistant, phone number, or account settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of the call event'),
      callId: z.string().optional().describe('ID of the associated call'),
      timestamp: z.string().optional().describe('Timestamp of the event'),
      rawPayload: z.any().describe('Raw event payload from Vapi')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('ID of the call'),
      type: z
        .string()
        .optional()
        .describe('Call type (inboundPhoneCall, outboundPhoneCall, webCall)'),
      status: z.string().optional().describe('Call status'),
      assistantId: z.string().optional().describe('Assistant ID handling the call'),
      phoneNumberId: z.string().optional().describe('Phone number ID used'),
      customerNumber: z.string().optional().describe('Customer phone number'),
      transcript: z.string().optional().describe('Call transcript (for end-of-call report)'),
      recordingUrl: z
        .string()
        .optional()
        .describe('Call recording URL (for end-of-call report)'),
      summary: z.string().optional().describe('Call summary (for end-of-call report)'),
      endedReason: z.string().optional().describe('Reason the call ended'),
      duration: z.number().optional().describe('Call duration in seconds'),
      messages: z.any().optional().describe('Conversation messages'),
      transcriptText: z.string().optional().describe('Transcript text for transcript events'),
      transcriptType: z.string().optional().describe('Transcript type (partial or final)'),
      speechStatus: z.string().optional().describe('Speech status (started or stopped)'),
      role: z.string().optional().describe('Role for speech/transcript (assistant or user)'),
      transferDestination: z.any().optional().describe('Transfer destination details')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.message?.type || data.type || 'unknown';
      let call = data.message?.call || data.call;
      let callId = call?.id || data.message?.callId;
      let timestamp = data.message?.timestamp || new Date().toISOString();

      return {
        inputs: [
          {
            eventType,
            callId,
            timestamp,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, callId, rawPayload } = ctx.input;
      let message = rawPayload.message || rawPayload;
      let call = message.call || {};

      let output: Record<string, any> = {
        callId: callId || call.id,
        type: call.type,
        status: call.status,
        assistantId: call.assistantId,
        phoneNumberId: call.phoneNumberId,
        customerNumber: call.customer?.number
      };

      if (eventType === 'end-of-call-report') {
        output.transcript = message.artifact?.transcript || call.artifact?.transcript;
        output.recordingUrl = message.artifact?.recordingUrl || call.artifact?.recordingUrl;
        output.summary = message.analysis?.summary || call.analysis?.summary;
        output.endedReason = message.endedReason || call.endedReason;
        output.duration = call.duration;
        output.messages = message.artifact?.messages || call.messages;
      }

      if (eventType === 'status-update') {
        output.status = message.status || call.status;
      }

      if (eventType === 'transcript') {
        output.transcriptText = message.transcript;
        output.transcriptType = message.transcriptType;
        output.role = message.role;
      }

      if (eventType === 'speech-update') {
        output.speechStatus = message.status;
        output.role = message.role;
      }

      if (eventType === 'transfer-update') {
        output.transferDestination = message.destination;
      }

      return {
        type: `call.${eventType}`,
        id: `${callId || 'unknown'}-${eventType}-${ctx.input.timestamp || Date.now()}`,
        output
      };
    }
  })
  .build();
