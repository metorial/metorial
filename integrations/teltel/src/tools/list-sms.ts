import { createApiServiceError, SlateTool } from 'slates';
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
      offset: z.number().optional().describe('Offset for pagination'),
      direction: z
        .enum(['outbound', 'inbound', 'both'])
        .optional()
        .describe('Message direction. Defaults to both sent and received messages.')
    })
  )
  .output(
    z.object({
      messages: z.array(z.any()).describe('List of SMS message records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelTelClient(ctx.auth.token);

    let directions =
      ctx.input.direction && ctx.input.direction !== 'both'
        ? [ctx.input.direction]
        : (['outbound', 'inbound'] as const);
    let limit = ctx.input.limit ?? 500;
    let offset = ctx.input.offset ?? 0;
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 5000 ||
      !Number.isInteger(offset) ||
      offset < 0
    ) {
      throw createApiServiceError(
        'Provide a whole-number limit from 1 to 5000 and a non-negative whole-number offset.'
      );
    }
    if (directions.length === 2 && limit + offset > 5000) {
      throw createApiServiceError(
        'For both message directions, offset plus limit must not exceed 5000. Select one direction to paginate further.'
      );
    }
    let messages: any[] = [];
    for (let direction of directions) {
      let result = await client.listSms({
        dateFrom: ctx.input.dateFrom,
        dateTo: ctx.input.dateTo,
        limit: directions.length === 2 ? limit + offset : limit,
        offset: directions.length === 2 ? 0 : offset,
        direction
      });
      let records = Array.isArray(result) ? result : (result?.data ?? result?.messages ?? []);
      messages.push(...records);
    }
    messages.sort((a, b) =>
      String(b.created_at ?? b.received_at ?? '').localeCompare(
        String(a.created_at ?? a.received_at ?? '')
      )
    );
    messages =
      directions.length === 2
        ? messages.slice(offset, offset + limit)
        : messages.slice(0, limit);

    return {
      output: {
        messages
      },
      message: `Retrieved **${messages.length}** SMS message(s).`
    };
  })
  .build();
