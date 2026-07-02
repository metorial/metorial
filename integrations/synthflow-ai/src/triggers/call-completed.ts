import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let callCompletedPolling = SlateTrigger.create(spec, {
  name: 'Call Completed',
  key: 'call_completed_polling',
  description:
    '[Polling fallback] Polls for newly completed calls on a specific agent. Detects new calls since the last poll and provides full call details including transcript, status, and collected variables.'
})
  .input(
    z.object({
      callId: z.string().describe('Unique call identifier'),
      callStatus: z.string().optional().describe('Call status'),
      transcript: z.string().optional().describe('Call transcript'),
      recordingUrl: z.string().optional().describe('Recording URL'),
      duration: z.number().optional().describe('Call duration in seconds'),
      leadName: z.string().optional().describe('Lead name'),
      leadPhone: z.string().optional().describe('Lead phone number'),
      createdAt: z.string().optional().describe('Call creation timestamp'),
      raw: z.record(z.string(), z.any()).optional().describe('Full call record')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique call identifier'),
      callStatus: z.string().optional().describe('Call completion status'),
      transcript: z.string().optional().describe('Full call transcript'),
      recordingUrl: z.string().optional().describe('URL to the call recording'),
      duration: z.number().optional().describe('Call duration in seconds'),
      leadName: z.string().optional().describe('Lead name'),
      leadPhone: z.string().optional().describe('Lead phone number'),
      createdAt: z.string().optional().describe('Call creation timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let state = ctx.state as { lastPollTimestamp?: number; agentId?: string } | null;
      let agentId = state?.agentId;

      if (!agentId) {
        return { inputs: [], updatedState: state || {} };
      }

      let client = new Client({ token: ctx.auth.token });
      let now = Date.now();
      let fromDate = state?.lastPollTimestamp || now - 60 * 60 * 1000;

      let result = await client.listCalls({
        model_id: agentId,
        from_date: fromDate,
        limit: 50
      });

      let calls = result.response?.calls || [];
      let inputs = calls.map((call: any) => ({
        callId: call.call_id || call.id,
        callStatus: call.call_status || call.status,
        transcript: call.transcript,
        recordingUrl: call.recording_url,
        duration: call.duration,
        leadName: call.lead_name || call.name,
        leadPhone: call.lead_phone || call.phone,
        createdAt: call.created_at,
        raw: call
      }));

      return {
        inputs,
        updatedState: {
          lastPollTimestamp: now,
          agentId
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: `call.${ctx.input.callStatus || 'completed'}`,
        id: ctx.input.callId,
        output: {
          callId: ctx.input.callId,
          callStatus: ctx.input.callStatus,
          transcript: ctx.input.transcript,
          recordingUrl: ctx.input.recordingUrl,
          duration: ctx.input.duration,
          leadName: ctx.input.leadName,
          leadPhone: ctx.input.leadPhone,
          createdAt: ctx.input.createdAt
        }
      };
    }
  })
  .build();
