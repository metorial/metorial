import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/admin-client';
import { spec } from '../spec';

export let getDailyUsage = SlateTool.create(spec, {
  name: 'Get Daily Usage',
  key: 'get_daily_usage',
  description: `Retrieve daily usage metrics for your team within a date range. Provides insights into code edits, AI assistance usage, tab completions, and acceptance rates per user per day. Requires an Admin API key.`,
  constraints: ['Maximum date range of 30 days per request.', 'Poll at most once per hour.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      startDate: z.number().describe('Start date as epoch milliseconds'),
      endDate: z.number().describe('End date as epoch milliseconds'),
      page: z.number().optional().describe('Page number for pagination'),
      pageSize: z.number().optional().describe('Number of results per page')
    })
  )
  .output(
    z.object({
      entries: z.array(
        z.object({
          userId: z.number().describe('User ID'),
          day: z.string().describe('ISO date string (YYYY-MM-DD)'),
          email: z.string().describe('User email'),
          isActive: z.boolean().describe('Whether the user was active'),
          totalLinesAdded: z.number().describe('Total lines added'),
          totalLinesDeleted: z.number().describe('Total lines deleted'),
          acceptedLinesAdded: z.number().describe('Accepted lines added'),
          acceptedLinesDeleted: z.number().describe('Accepted lines deleted'),
          totalAccepts: z.number().describe('Total accepts'),
          totalRejects: z.number().describe('Total rejects'),
          totalTabsShown: z.number().describe('Total tab suggestions shown'),
          totalTabsAccepted: z.number().describe('Total tab suggestions accepted'),
          composerRequests: z.number().describe('Number of composer requests'),
          chatRequests: z.number().describe('Number of chat requests'),
          agentRequests: z.number().describe('Number of agent requests'),
          mostUsedModel: z.string().nullable().describe('Most frequently used AI model')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new AdminClient({ token: ctx.auth.token });
    let result = await client.getDailyUsage({
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let entries = (result.data ?? []).map(e => ({
      userId: e.userId,
      day: e.day,
      email: e.email,
      isActive: e.isActive,
      totalLinesAdded: e.totalLinesAdded,
      totalLinesDeleted: e.totalLinesDeleted,
      acceptedLinesAdded: e.acceptedLinesAdded,
      acceptedLinesDeleted: e.acceptedLinesDeleted,
      totalAccepts: e.totalAccepts,
      totalRejects: e.totalRejects,
      totalTabsShown: e.totalTabsShown,
      totalTabsAccepted: e.totalTabsAccepted,
      composerRequests: e.composerRequests,
      chatRequests: e.chatRequests,
      agentRequests: e.agentRequests,
      mostUsedModel: e.mostUsedModel
    }));

    return {
      output: { entries },
      message: `Retrieved **${entries.length}** daily usage entries.`
    };
  })
  .build();
