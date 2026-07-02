import { SlateTool } from 'slates';
import { z } from 'zod';
import { GongClient } from '../lib/client';
import { spec } from '../spec';

let _activityStatsSchema = z.object({
  userId: z.string().describe('User ID'),
  callsAsHost: z.number().optional().describe('Calls hosted'),
  callsAttended: z.number().optional().describe('Calls attended'),
  callsGaveFeedback: z.number().optional().describe('Calls user gave feedback on'),
  callsRequestedFeedback: z.number().optional().describe('Calls where feedback was requested'),
  callsReceivedFeedback: z.number().optional().describe('Calls where user received feedback'),
  callsAccessedInGong: z.number().optional().describe('Calls accessed in Gong'),
  callsListenedTo: z.number().optional().describe('Calls listened to'),
  callsSharedWith: z.number().optional().describe('Calls shared with user'),
  ownCallsListenedTo: z.number().optional().describe('Own calls listened to'),
  othersCallsListenedTo: z.number().optional().describe('Others calls listened to'),
  callsScorecardsFilled: z.number().optional().describe('Scorecards filled'),
  callsScorecardsFilled_ForOthers: z
    .number()
    .optional()
    .describe('Scorecards filled for others')
});

export let getUserActivityStats = SlateTool.create(spec, {
  name: 'Get User Activity Stats',
  key: 'get_user_activity_stats',
  description: `Retrieve aggregated activity statistics for Gong users over a date range. Returns metrics like calls hosted, attended, feedback given/received, and listening activity. Optionally retrieve **daily breakdowns** or **interaction stats** (talk ratio, longest monologue, etc.).`,
  instructions: [
    'Set mode to "aggregate" for totals, "daily" for day-by-day breakdown, or "interaction" for interaction metrics.',
    'Dates should be in YYYY-MM-DD format (not ISO 8601 datetime).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fromDate: z.string().describe('Start date in YYYY-MM-DD format'),
      toDate: z.string().describe('End date in YYYY-MM-DD format'),
      userIds: z.array(z.string()).optional().describe('Filter to specific user IDs'),
      mode: z
        .enum(['aggregate', 'daily', 'interaction'])
        .default('aggregate')
        .describe('Type of stats to retrieve'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      userStats: z.array(z.any()).describe('Activity statistics per user'),
      timeZone: z.string().optional().describe('Company timezone (for interaction stats)'),
      totalRecords: z.number().optional().describe('Total records'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GongClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl
    });

    let result: any;
    let mode = ctx.input.mode;

    if (mode === 'daily') {
      result = await client.getDailyActivity({
        filter: {
          fromDate: ctx.input.fromDate,
          toDate: ctx.input.toDate,
          userIds: ctx.input.userIds
        },
        cursor: ctx.input.cursor
      });
    } else if (mode === 'interaction') {
      result = await client.getInteractionStats({
        filter: {
          fromDate: ctx.input.fromDate,
          toDate: ctx.input.toDate,
          userIds: ctx.input.userIds
        },
        cursor: ctx.input.cursor
      });
    } else {
      result = await client.getAggregateActivity({
        filter: {
          fromDate: ctx.input.fromDate,
          toDate: ctx.input.toDate,
          userIds: ctx.input.userIds
        },
        cursor: ctx.input.cursor
      });
    }

    let userStats =
      result.usersDetailedActivities ||
      result.usersAggregateActivities ||
      result.usersAggregateActivityByPeriod ||
      result.peopleInteractionStats ||
      [];

    return {
      output: {
        userStats,
        timeZone: result.timeZone,
        totalRecords: result.records?.totalRecords,
        cursor: result.records?.cursor
      },
      message: `Retrieved ${mode} activity stats for ${Array.isArray(userStats) ? userStats.length : 0} user(s).`
    };
  })
  .build();
