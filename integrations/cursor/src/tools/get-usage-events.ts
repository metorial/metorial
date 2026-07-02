import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let getUsageEvents = SlateTool.create(spec, {
  name: 'Get Usage Events',
  key: 'get_usage_events',
  description: `Retrieve detailed usage events for your team with filtering by date range, user, and pagination. Provides granular insights into individual API calls, model usage, token consumption, and costs. Requires an Admin API key.`,
  constraints: ['Maximum date range of 30 days.', 'Poll at most once per hour.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.number().describe('Start date as epoch milliseconds'),
      endDate: z.number().describe('End date as epoch milliseconds'),
      userId: z.number().optional().describe('Filter by user ID'),
      email: z.string().optional().describe('Filter by user email'),
      page: z.number().optional().describe('Page number (default 1)'),
      pageSize: z.number().optional().describe('Results per page (default 10)')
    })
  )
  .output(
    z.object({
      events: z.array(
        z.object({
          timestamp: z.string().describe('Event timestamp (epoch ms as string)'),
          userEmail: z.string().describe('User email'),
          model: z.string().describe('AI model used'),
          kind: z.string().describe('Billing category'),
          isChargeable: z.boolean().describe('Whether the event is chargeable'),
          inputTokens: z.number().describe('Input tokens consumed'),
          outputTokens: z.number().describe('Output tokens generated'),
          chargedCents: z.number().describe('Amount charged in cents')
        })
      ),
      totalCount: z.number().describe('Total number of usage events matching the query'),
      hasNextPage: z.boolean().describe('Whether more pages are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.getUsageEvents({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      userId: ctx.input.userId,
      email: ctx.input.email,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        events: result.data.map(e => ({
          timestamp: e.timestamp,
          userEmail: e.userEmail,
          model: e.model,
          kind: e.kind,
          isChargeable: e.isChargeable,
          inputTokens: e.tokenUsage.inputTokens,
          outputTokens: e.tokenUsage.outputTokens,
          chargedCents: e.chargedCents
        })),
        totalCount: result.totalUsageEventsCount,
        hasNextPage: result.pagination.hasNextPage
      },
      message: `Retrieved **${result.data.length}** event(s) out of ${result.totalUsageEventsCount} total.`
    };
  })
  .build();
