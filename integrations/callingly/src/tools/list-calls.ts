import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List calls with optional filtering by date range, team, and pagination. Returns call details including status, direction, duration, and associated lead information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.string().optional().describe('Start date for filtering calls (YYYY-MM-DD)'),
      end: z.string().optional().describe('End date for filtering calls (YYYY-MM-DD)'),
      teamId: z.string().optional().describe('Filter calls by team ID'),
      limit: z.number().optional().describe('Maximum number of calls to return'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      calls: z
        .array(
          z.object({
            callId: z.string().describe('ID of the call'),
            startedAt: z.string().optional().describe('When the call started'),
            direction: z.string().optional().describe('Call direction'),
            status: z.string().optional().describe('Call status'),
            leadStatus: z.string().optional().describe('Lead status after the call'),
            duration: z.number().optional().describe('Duration in seconds'),
            recordingUrl: z.string().optional().describe('URL to recording'),
            lead: z.record(z.string(), z.any()).optional().describe('Associated lead')
          })
        )
        .describe('List of calls')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountId: ctx.config.accountId
    });

    let result = await client.listCalls({
      start: ctx.input.start,
      end: ctx.input.end,
      teamId: ctx.input.teamId,
      limit: ctx.input.limit,
      page: ctx.input.page
    });

    let callsArray = Array.isArray(result) ? result : (result.calls ?? result.data ?? []);

    let calls = callsArray.map((call: any) => ({
      callId: String(call.id),
      startedAt: call.started_at,
      direction: call.direction,
      status: call.status,
      leadStatus: call.lead_status,
      duration: call.seconds ?? call.duration,
      recordingUrl: call.recording_url,
      lead: call.lead
    }));

    return {
      output: { calls },
      message: `Found **${calls.length}** call(s).`
    };
  })
  .build();
