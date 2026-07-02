import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let getCall = SlateTool.create(spec, {
  name: 'Get Call',
  key: 'get_call',
  description: `Retrieve detailed information about a specific call, including transcript, recording URL, call analysis, cost breakdown, latency metrics, and disconnection reason.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      callId: z.string().describe('Unique identifier of the call to retrieve')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique identifier of the call'),
      callType: z.string().describe('Type of call (phone_call or web_call)'),
      agentId: z.string().describe('Agent ID used for the call'),
      agentName: z.string().optional().describe('Agent name'),
      callStatus: z
        .string()
        .describe('Status: registered, not_connected, ongoing, ended, or error'),
      direction: z.string().optional().describe('Call direction: inbound or outbound'),
      fromNumber: z.string().optional().describe('Caller phone number (phone calls only)'),
      toNumber: z.string().optional().describe('Callee phone number (phone calls only)'),
      startTimestamp: z.number().optional().describe('Call start timestamp in ms'),
      endTimestamp: z.number().optional().describe('Call end timestamp in ms'),
      durationMs: z.number().optional().describe('Call duration in milliseconds'),
      transcript: z.string().optional().describe('Full call transcription'),
      recordingUrl: z.string().optional().describe('URL to call recording'),
      callAnalysis: z
        .any()
        .optional()
        .describe('Post-call analysis including sentiment, summary, and custom data'),
      callCost: z.any().optional().describe('Cost breakdown of the call'),
      disconnectionReason: z.string().optional().describe('Reason the call was disconnected'),
      metadata: z.any().optional().describe('Custom metadata attached to the call')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);
    let call = await client.getCall(ctx.input.callId);

    return {
      output: {
        callId: call.call_id,
        callType: call.call_type,
        agentId: call.agent_id,
        agentName: call.agent_name,
        callStatus: call.call_status,
        direction: call.direction,
        fromNumber: call.from_number,
        toNumber: call.to_number,
        startTimestamp: call.start_timestamp,
        endTimestamp: call.end_timestamp,
        durationMs: call.duration_ms,
        transcript: call.transcript,
        recordingUrl: call.recording_url,
        callAnalysis: call.call_analysis,
        callCost: call.call_cost,
        disconnectionReason: call.disconnection_reason,
        metadata: call.metadata
      },
      message: `Retrieved call **${call.call_id}** (${call.call_status}${call.duration_ms ? `, ${Math.round(call.duration_ms / 1000)}s` : ''}).`
    };
  })
  .build();
