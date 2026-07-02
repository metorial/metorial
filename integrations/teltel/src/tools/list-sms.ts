import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelTelClient } from '../lib/client';
import { spec } from '../spec';

export let listSmsTool = SlateTool.create(spec, {
  name: 'List SMS Messages',
  key: 'list_sms',
  description: `Retrieve SMS message history from TelTel. Returns details about sent and received SMS messages including phone numbers, status, and timestamps.
Use date filters to narrow results.`,
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
        .describe('Start date filter (ISO 8601 format, e.g. "2024-01-01")'),
      dateTo: z
        .string()
        .optional()
        .describe('End date filter (ISO 8601 format, e.g. "2024-01-31")'),
      limit: z.number().optional().describe('Maximum number of results to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      messages: z.array(z.any()).describe('List of SMS message records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);

    let result = await client.listSms({
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let messages = Array.isArray(result) ? result : (result?.data ?? result?.messages ?? []);

    return {
      output: {
        messages
      },
      message: `Retrieved **${messages.length}** SMS message(s).`
    };
  })
  .build();
