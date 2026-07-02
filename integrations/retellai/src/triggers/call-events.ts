import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let callEvents = SlateTrigger.create(spec, {
  name: 'Call Events',
  key: 'call_events',
  description:
    'Triggered on call lifecycle events: call started, call ended, call analyzed, and transcript updates. Configure the webhook URL in Retell AI dashboard or on the agent.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Type of event (call_started, call_ended, call_analyzed, transcript_updated)'
        ),
      callId: z.string().describe('Unique identifier of the call'),
      callType: z.string().optional().describe('Type of call (phone_call or web_call)'),
      agentId: z.string().optional().describe('Agent ID associated with the call'),
      agentName: z.string().optional().describe('Agent name'),
      callStatus: z.string().optional().describe('Call status'),
      direction: z.string().optional().describe('Call direction'),
      fromNumber: z.string().optional().describe('Source phone number'),
      toNumber: z.string().optional().describe('Destination phone number'),
      startTimestamp: z.number().optional().describe('Call start timestamp'),
      endTimestamp: z.number().optional().describe('Call end timestamp'),
      durationMs: z.number().optional().describe('Call duration in milliseconds'),
      transcript: z.string().optional().describe('Call transcript'),
      recordingUrl: z.string().optional().describe('Recording URL'),
      callAnalysis: z.any().optional().describe('Post-call analysis data'),
      disconnectionReason: z.string().optional().describe('Disconnection reason'),
      metadata: z.any().optional().describe('Custom metadata')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique identifier of the call'),
      callType: z.string().optional().describe('Type of call'),
      agentId: z.string().optional().describe('Agent ID'),
      agentName: z.string().optional().describe('Agent name'),
      callStatus: z.string().optional().describe('Call status'),
      direction: z.string().optional().describe('Call direction'),
      fromNumber: z.string().optional().describe('Source phone number'),
      toNumber: z.string().optional().describe('Destination phone number'),
      startTimestamp: z.number().optional().describe('Call start timestamp'),
      endTimestamp: z.number().optional().describe('Call end timestamp'),
      durationMs: z.number().optional().describe('Call duration in ms'),
      transcript: z.string().optional().describe('Call transcript'),
      recordingUrl: z.string().optional().describe('Recording URL'),
      callAnalysis: z.any().optional().describe('Post-call analysis'),
      disconnectionReason: z.string().optional().describe('Disconnection reason'),
      metadata: z.any().optional().describe('Custom metadata')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.event;
      let callData = body.call || body.data || body;

      let callId = callData.call_id || '';

      return {
        inputs: [
          {
            eventType: eventType,
            callId: callId,
            callType: callData.call_type,
            agentId: callData.agent_id,
            agentName: callData.agent_name,
            callStatus: callData.call_status,
            direction: callData.direction,
            fromNumber: callData.from_number,
            toNumber: callData.to_number,
            startTimestamp: callData.start_timestamp,
            endTimestamp: callData.end_timestamp,
            durationMs: callData.duration_ms,
            transcript: callData.transcript,
            recordingUrl: callData.recording_url,
            callAnalysis: callData.call_analysis,
            disconnectionReason: callData.disconnection_reason,
            metadata: callData.metadata
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `call.${ctx.input.eventType}`,
        id: `${ctx.input.callId}-${ctx.input.eventType}`,
        output: {
          callId: ctx.input.callId,
          callType: ctx.input.callType,
          agentId: ctx.input.agentId,
          agentName: ctx.input.agentName,
          callStatus: ctx.input.callStatus,
          direction: ctx.input.direction,
          fromNumber: ctx.input.fromNumber,
          toNumber: ctx.input.toNumber,
          startTimestamp: ctx.input.startTimestamp,
          endTimestamp: ctx.input.endTimestamp,
          durationMs: ctx.input.durationMs,
          transcript: ctx.input.transcript,
          recordingUrl: ctx.input.recordingUrl,
          callAnalysis: ctx.input.callAnalysis,
          disconnectionReason: ctx.input.disconnectionReason,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
