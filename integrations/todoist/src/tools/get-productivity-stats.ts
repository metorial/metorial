import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProductivityStats = SlateTool.create(spec, {
  name: 'Get Productivity Stats',
  key: 'get_productivity_stats',
  description: `Retrieve the user's productivity statistics including completed task counts, karma score, and daily/weekly goal streaks.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      karmaScore: z.number().optional().describe('Current karma score'),
      karmaLastUpdate: z.number().optional().describe('Last karma update value'),
      karmaDisabled: z.boolean().optional().describe('Whether karma is disabled'),
      completedToday: z.number().optional().describe('Tasks completed today'),
      completedThisWeek: z.number().optional().describe('Tasks completed this week'),
      daysItems: z
        .array(
          z.object({
            date: z.string(),
            totalCompleted: z.number()
          })
        )
        .optional()
        .describe('Daily completion counts'),
      weekItems: z
        .array(
          z.object({
            date: z.string(),
            totalCompleted: z.number()
          })
        )
        .optional()
        .describe('Weekly completion counts'),
      currentDailyStreak: z
        .object({
          count: z.number(),
          startDate: z.string().optional(),
          endDate: z.string().optional()
        })
        .optional()
        .describe('Current daily goal streak'),
      currentWeeklyStreak: z
        .object({
          count: z.number(),
          startDate: z.string().optional(),
          endDate: z.string().optional()
        })
        .optional()
        .describe('Current weekly goal streak')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let stats = await client.getProductivityStats();

    let dailyStreak = stats.goals?.current_daily_streak;
    let weeklyStreak = stats.goals?.current_weekly_streak;
    let completedToday = stats.days_items?.at(-1)?.total_completed;
    let completedThisWeek = stats.week_items?.at(-1)?.total_completed;

    return {
      output: {
        karmaScore: stats.karma,
        karmaLastUpdate: stats.karma_last_update,
        karmaDisabled:
          stats.goals?.karma_disabled === undefined
            ? undefined
            : Boolean(stats.goals.karma_disabled),
        completedToday,
        completedThisWeek,
        daysItems: stats.days_items?.map((d: any) => ({
          date: d.date,
          totalCompleted: d.total_completed
        })),
        weekItems: stats.week_items?.map((w: any) => ({
          date: w.from,
          totalCompleted: w.total_completed
        })),
        currentDailyStreak: dailyStreak
          ? {
              count: dailyStreak.count,
              startDate: dailyStreak.start ?? undefined,
              endDate: dailyStreak.end ?? undefined
            }
          : undefined,
        currentWeeklyStreak: weeklyStreak
          ? {
              count: weeklyStreak.count,
              startDate: weeklyStreak.start ?? undefined,
              endDate: weeklyStreak.end ?? undefined
            }
          : undefined
      },
      message: `Karma: **${stats.karma || 0}**, completed today: **${completedToday ?? 0}**.`
    };
  });
