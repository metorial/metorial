import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `List and filter calls in your Retell AI account. Filter by agent, status, type, direction, sentiment, date range, and more. Supports pagination and sorting.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .min(1)
        .max(1000)
        .optional()
        .describe('Maximum number of calls to return (1-1000, default 50)'),
      sortOrder: z
        .enum(['ascending', 'descending'])
        .optional()
        .describe('Sort direction by start timestamp (default descending)'),
      paginationKey: z.string().optional().describe('Call ID for fetching the next page'),
      filterAgentIds: z.array(z.string()).optional().describe('Filter by agent IDs'),
      filterCallStatus: z
        .array(z.enum(['not_connected', 'ongoing', 'ended', 'error']))
        .optional()
        .describe('Filter by call status'),
      filterCallType: z
        .array(z.enum(['web_call', 'phone_call']))
        .optional()
        .describe('Filter by call type'),
      filterDirection: z
        .array(z.enum(['inbound', 'outbound']))
        .optional()
        .describe('Filter by call direction'),
      filterSentiment: z
        .array(z.enum(['Negative', 'Positive', 'Neutral', 'Unknown']))
        .optional()
        .describe('Filter by user sentiment')
    })
  )
  .output(
    z.object({
      calls: z
        .array(
          z.object({
            callId: z.string().describe('Unique identifier of the call'),
            callType: z.string().describe('Type of call'),
            agentId: z.string().describe('Agent ID used'),
            agentName: z.string().optional().describe('Agent name'),
            callStatus: z.string().describe('Call status'),
            direction: z.string().optional().describe('Call direction'),
            fromNumber: z.string().optional().describe('Source phone number'),
            toNumber: z.string().optional().describe('Destination phone number'),
            startTimestamp: z.number().optional().describe('Call start timestamp'),
            endTimestamp: z.number().optional().describe('Call end timestamp'),
            durationMs: z.number().optional().describe('Duration in milliseconds'),
            disconnectionReason: z.string().optional().describe('Disconnection reason')
          })
        )
        .describe('List of calls')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {};
    if (ctx.input.limit) body.limit = ctx.input.limit;
    if (ctx.input.sortOrder) body.sort_order = ctx.input.sortOrder;
    if (ctx.input.paginationKey) body.pagination_key = ctx.input.paginationKey;

    let filterCriteria: Record<string, any> = {};
    if (ctx.input.filterAgentIds) filterCriteria.agent_id = ctx.input.filterAgentIds;
    if (ctx.input.filterCallStatus) filterCriteria.call_status = ctx.input.filterCallStatus;
    if (ctx.input.filterCallType) filterCriteria.call_type = ctx.input.filterCallType;
    if (ctx.input.filterDirection) filterCriteria.direction = ctx.input.filterDirection;
    if (ctx.input.filterSentiment) filterCriteria.user_sentiment = ctx.input.filterSentiment;

    if (Object.keys(filterCriteria).length > 0) {
      body.filter_criteria = filterCriteria;
    }

    let calls = await client.listCalls(body);

    let mapped = (calls as any[]).map((c: any) => ({
      callId: c.call_id,
      callType: c.call_type,
      agentId: c.agent_id,
      agentName: c.agent_name,
      callStatus: c.call_status,
      direction: c.direction,
      fromNumber: c.from_number,
      toNumber: c.to_number,
      startTimestamp: c.start_timestamp,
      endTimestamp: c.end_timestamp,
      durationMs: c.duration_ms,
      disconnectionReason: c.disconnection_reason
    }));

    return {
      output: { calls: mapped },
      message: `Found **${mapped.length}** call(s).`
    };
  })
  .build();
