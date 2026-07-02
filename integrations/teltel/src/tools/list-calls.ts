import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let listCallsTool = SlateTool.create(spec, {
  name: 'List Calls',
  key: 'list_calls',
  description: `Retrieve call data records (CDR) from TelTel. Returns detailed information about calls including duration, time, status, and audio recording URLs.
Use date filters to narrow down results, or filter by user to see a specific agent's calls.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      dateFrom: z
        .string()
        .optional()
        .describe('Start date for filtering calls (ISO 8601 format, e.g. "2024-01-01")'),
      dateTo: z
        .string()
        .optional()
        .describe('End date for filtering calls (ISO 8601 format, e.g. "2024-01-31")'),
      userId: z.string().optional().describe('Filter calls by a specific user ID'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      calls: z
        .array(z.any())
        .describe('List of call records with details like duration, status, and recordings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);

    let result = await client.listCalls({
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      userId: ctx.input.userId,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let calls = Array.isArray(result) ? result : (result?.data ?? result?.calls ?? [result]);

    return {
      output: {
        calls
      },
      message: `Retrieved **${calls.length}** call record(s).`
    };
  })
  .build();
