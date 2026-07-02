import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getActivity = SlateTool.create(spec, {
  name: 'Get Email Activity',
  key: 'get_activity',
  description: `Retrieve email activity for a domain within a specified date range. Filter by event types such as sent, delivered, bounced, opened, clicked, etc.
Returns detailed activity records including recipient info, timestamps, and event details.`,
  constraints: [
    'Maximum 7-day timeframe between dateFrom and dateTo.',
    'Both dateFrom and dateTo are required as Unix timestamps (UTC).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('Domain ID to get activity for.'),
      dateFrom: z.number().describe('Start of date range as Unix timestamp (UTC).'),
      dateTo: z
        .number()
        .describe('End of date range as Unix timestamp (UTC). Max 7 days after dateFrom.'),
      events: z
        .array(
          z.enum([
            'queued',
            'sent',
            'delivered',
            'soft_bounced',
            'hard_bounced',
            'deferred',
            'opened',
            'clicked',
            'unsubscribed',
            'spam_complaints',
            'survey_opened',
            'survey_submitted'
          ])
        )
        .optional()
        .describe('Filter by specific event types.'),
      page: z.number().optional().describe('Page number for pagination.'),
      limit: z
        .number()
        .min(10)
        .max(100)
        .optional()
        .describe('Results per page (10-100, default 25).')
    })
  )
  .output(
    z.object({
      activities: z
        .array(z.record(z.string(), z.unknown()))
        .describe('List of activity records with event details.'),
      total: z.number().describe('Total number of matching activities.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listActivity(ctx.input.domainId, {
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      events: ctx.input.events,
      page: ctx.input.page,
      limit: ctx.input.limit
    });

    let total =
      ((result.meta as Record<string, unknown>)?.total as number) ??
      (result.data || []).length;

    return {
      output: {
        activities: result.data || [],
        total
      },
      message: `Found **${total}** activity records for domain \`${ctx.input.domainId}\`.`
    };
  })
  .build();
