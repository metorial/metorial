import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let getSpend = SlateTool.create(spec, {
  name: 'Get Team Spend',
  key: 'get_team_spend',
  description: `Retrieve per-member spend data for the current billing cycle. Shows spend in cents, request counts, and configured spend limits. Requires an Admin API key.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerm: z.string().optional().describe('Search by member name or email'),
      sortBy: z.enum(['amount', 'date', 'user']).optional().describe('Sort field'),
      sortDirection: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      page: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      members: z.array(
        z.object({
          userId: z.number().describe('User ID'),
          name: z.string().describe('Member name'),
          email: z.string().describe('Member email'),
          role: z.string().describe('Member role'),
          spendCents: z
            .number()
            .describe('Total spend in cents for the current billing cycle'),
          fastPremiumRequests: z.number().describe('Number of fast premium requests'),
          hardLimitOverrideDollars: z
            .number()
            .describe('Hard spend limit override in dollars'),
          monthlyLimitDollars: z.number().nullable().describe('Monthly spend limit in dollars')
        })
      ),
      subscriptionCycleStart: z.string().describe('Start of the current billing cycle'),
      totalMembers: z.number().describe('Total number of team members'),
      totalPages: z.number().describe('Total pages available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.getSpend({
      searchTerm: ctx.input.searchTerm,
      sortBy: ctx.input.sortBy,
      sortDirection: ctx.input.sortDirection,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        members: result.data.map(m => ({
          userId: m.userId,
          name: m.name,
          email: m.email,
          role: m.role,
          spendCents: m.spendCents,
          fastPremiumRequests: m.fastPremiumRequests,
          hardLimitOverrideDollars: m.hardLimitOverrideDollars,
          monthlyLimitDollars: m.monthlyLimitDollars
        })),
        subscriptionCycleStart: result.subscriptionCycleStart,
        totalMembers: result.totalMembers,
        totalPages: result.totalPages
      },
      message: `Retrieved spend data for **${result.data.length}** member(s). Billing cycle started on ${result.subscriptionCycleStart}.`
    };
  })
  .build();
