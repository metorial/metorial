import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccountActivity = SlateTool.create(spec, {
  name: 'Get Account Activity',
  key: 'get_account_activity',
  description: `Track API usage by listing unlocked reports with timestamps and completion status. Filter by date range and paginate through results to audit which influencer reports have been accessed.`,
  constraints: [
    'Only available for API subscription accounts.',
    'Maximum 100 results per request.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().max(100).optional().describe('Maximum results to return (max 100)'),
      dateFrom: z.string().optional().describe('Start date filter (YYYY-MM-DD HH:MM:SS)'),
      dateTo: z.string().optional().describe('End date filter (YYYY-MM-DD HH:MM:SS)'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      unlockedReports: z
        .array(
          z.object({
            username: z.string().optional().describe('Username of the unlocked influencer'),
            influencerId: z.string().optional().describe('Platform-specific ID'),
            platform: z.string().optional().describe('Social network type'),
            timeAdded: z.number().optional().describe('Timestamp when report was added'),
            timePaid: z.number().optional().describe('Timestamp when credit was used'),
            completed: z
              .number()
              .optional()
              .describe('Whether the report was completed (1 = yes)'),
            timeCompleted: z.number().optional().describe('Timestamp when report completed')
          })
        )
        .describe('Array of unlocked report records'),
      total: z.number().optional().describe('Total number of unlocked reports')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      clientId: ctx.auth.clientId,
      apiVersion: ctx.config.apiVersion
    });

    let response = await client.getUnlockedReports({
      limit: ctx.input.limit,
      dateFrom: ctx.input.dateFrom,
      dateTo: ctx.input.dateTo,
      offset: ctx.input.offset
    });

    let result = response?.result;
    let data = result?.data ?? [];

    let unlockedReports = data.map((item: any) => ({
      username: item.username,
      influencerId: item.id,
      platform: item.type,
      timeAdded: item.time_add,
      timePaid: item.time_pay,
      completed: item.completed,
      timeCompleted: item.time_completed
    }));

    return {
      output: {
        unlockedReports,
        total: result?.total
      },
      message: `Retrieved **${unlockedReports.length}** unlocked report(s) (total: ${result?.total ?? 'unknown'}).`
    };
  })
  .build();
