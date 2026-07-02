import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let callSchema = z.object({
  callId: z.string().describe('Unique identifier for the call'),
  title: z.string().optional().describe('Title of the call'),
  started: z.string().optional().describe('ISO 8601 start time of the call'),
  duration: z.number().optional().describe('Duration of the call in seconds'),
  direction: z.string().optional().describe('Call direction (Inbound/Outbound)'),
  scope: z.string().optional().describe('Call scope (Internal/External)'),
  url: z.string().optional().describe('URL to the call in Gong'),
  workspaceId: z.string().optional().describe('Workspace the call belongs to')
});

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `Retrieve a list of calls from Gong filtered by date range. Returns basic call metadata including title, duration, direction, and timestamps. Use this for browsing calls or finding calls within a specific time window.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDateTime: z
        .string()
        .optional()
        .describe('Start of the date range in ISO 8601 format (e.g., 2024-01-01T00:00:00Z)'),
      toDateTime: z.string().optional().describe('End of the date range in ISO 8601 format'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      workspaceId: z.string().optional().describe('Filter by workspace ID')
    })
  )
  .output(
    z.object({
      calls: z.array(callSchema).describe('List of calls'),
      totalRecords: z.number().optional().describe('Total number of matching records'),
      cursor: z.string().optional().describe('Cursor for next page, if more results exist')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result = await client.listCalls({
      fromDateTime: ctx.input.fromDateTime,
      toDateTime: ctx.input.toDateTime,
      cursor: ctx.input.cursor,
      workspaceId: ctx.input.workspaceId
    });

    let calls = (result.calls || []).map((call: any) => ({
      callId: call.id || call.callId,
      title: call.title,
      started: call.started,
      duration: call.duration,
      direction: call.direction,
      scope: call.scope,
      url: call.url,
      workspaceId: call.workspaceId
    }));

    return {
      output: {
        calls,
        totalRecords: result.records?.totalRecords,
        cursor: result.records?.cursor
      },
      message: `Retrieved ${calls.length} calls${result.records?.totalRecords ? ` out of ${result.records.totalRecords} total` : ''}.`
    };
  })
  .build();
