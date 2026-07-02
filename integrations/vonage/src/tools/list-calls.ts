import { SlateTool } from 'slates';
import { z } from 'zod';
import { VonageRestClient } from '../lib/client';
import { spec } from '../spec';

export let listCalls = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `Retrieve voice call records from the Vonage Voice API. Filter by status, date range, or conversation.
Use this to monitor call activity, check call statuses, or look up a specific call by UUID.
Requires the **API Key, Secret & Application JWT** auth method.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      callUuid: z
        .string()
        .optional()
        .describe('Specific call UUID to retrieve (overrides other filters)'),
      status: z
        .enum([
          'started',
          'ringing',
          'answered',
          'machine',
          'completed',
          'timeout',
          'failed',
          'rejected',
          'cancelled',
          'busy'
        ])
        .optional()
        .describe('Filter by call status'),
      dateStart: z
        .string()
        .optional()
        .describe('Filter calls from this date (ISO 8601 format)'),
      dateEnd: z
        .string()
        .optional()
        .describe('Filter calls until this date (ISO 8601 format)'),
      pageSize: z.number().optional().describe('Number of results per page (default: 10)'),
      recordIndex: z.number().optional().describe('Starting record index for pagination'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order by date'),
      conversationUuid: z.string().optional().describe('Filter by conversation UUID')
    })
  )
  .output(
    z.object({
      count: z.number().optional().describe('Total number of matching calls'),
      calls: z
        .array(
          z.object({
            callUuid: z.string().optional().describe('Call UUID'),
            conversationUuid: z.unknown().optional().describe('Conversation UUID'),
            status: z.unknown().optional().describe('Call status'),
            direction: z.unknown().optional().describe('Call direction (inbound/outbound)'),
            to: z.unknown().optional().describe('Destination endpoint'),
            from: z.unknown().optional().describe('Source endpoint'),
            startTime: z.unknown().optional().describe('Call start time'),
            endTime: z.unknown().optional().describe('Call end time'),
            duration: z.unknown().optional().describe('Call duration in seconds'),
            rate: z.unknown().optional().describe('Per-minute charge rate'),
            price: z.unknown().optional().describe('Total call cost'),
            network: z.unknown().optional().describe('Carrier network code')
          })
        )
        .describe('List of call records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new VonageRestClient({
      apiKey: ctx.auth.apiKey,
      apiSecret: ctx.auth.apiSecret,
      applicationId: ctx.auth.applicationId,
      privateKey: ctx.auth.privateKey
    });

    if (ctx.input.callUuid) {
      let call = await client.getCall(ctx.input.callUuid);
      return {
        output: { count: 1, calls: [call] },
        message: `Retrieved call \`${ctx.input.callUuid}\` — Status: **${call.status}**`
      };
    }

    let result = await client.listCalls({
      status: ctx.input.status,
      dateStart: ctx.input.dateStart,
      dateEnd: ctx.input.dateEnd,
      pageSize: ctx.input.pageSize,
      recordIndex: ctx.input.recordIndex,
      order: ctx.input.order,
      conversationUuid: ctx.input.conversationUuid
    });

    return {
      output: { count: result.count, calls: result.calls },
      message: `Found **${result.count}** call(s). Showing **${result.calls.length}** results.`
    };
  })
  .build();
