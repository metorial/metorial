import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCall = SlateTool.create(spec, {
  name: 'Get Call',
  key: 'get_call',
  description: `Retrieve detailed information about a specific call including its status, duration, recording URL, transcript, direction, and associated lead and agent details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      callId: z.string().describe('ID of the call to retrieve')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('ID of the call'),
      startedAt: z.string().optional().describe('When the call started'),
      direction: z.string().optional().describe('Call direction: inbound or outbound'),
      status: z.string().optional().describe('Call status (e.g., completed, missed, offline)'),
      leadStatus: z
        .string()
        .optional()
        .describe('Lead status after the call (e.g., contacted, missed, voicemail)'),
      duration: z.number().optional().describe('Call duration in seconds'),
      recordingUrl: z.string().optional().describe('URL to the call recording'),
      transcript: z.string().optional().describe('Call transcript if available'),
      lead: z
        .record(z.string(), z.any())
        .optional()
        .describe('Lead details associated with the call'),
      agent: z
        .record(z.string(), z.any())
        .optional()
        .describe('Agent details who handled the call')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.getCall(ctx.input.callId);

    return {
      output: {
        callId: String(result.id),
        startedAt: result.started_at,
        direction: result.direction,
        status: result.status,
        leadStatus: result.lead_status,
        duration: result.seconds ?? result.duration,
        recordingUrl: result.recording_url,
        transcript: result.transcript,
        lead: result.lead,
        agent: result.user ?? result.member
      },
      message: `Call **${result.id}** — ${result.direction ?? 'unknown'} ${result.status ?? 'unknown'}, duration: ${result.seconds ?? result.duration ?? 0}s.`
    };
  })
  .build();
