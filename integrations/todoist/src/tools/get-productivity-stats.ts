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

    return {
      output: {
        karmaScore: stats.karma,
        karmaLastUpdate: stats.karma_last_update,
        karmaDisabled: stats.karma_disabled,
        completedToday: stats.completed_today,
        completedThisWeek: stats.completed_this_week,
        daysItems: stats.days_items?.map((d: any) => ({
          date: d.date,
          totalCompleted: d.total_completed
        })),
        weekItems: stats.week_items?.map((w: any) => ({
          date: w.date,
          totalCompleted: w.total_completed
        })),
        currentDailyStreak: stats.current_daily_streak
          ? {
              count: stats.current_daily_streak.count,
              startDate: stats.current_daily_streak.start_date,
              endDate: stats.current_daily_streak.end_date
            }
          : undefined,
        currentWeeklyStreak: stats.current_weekly_streak
          ? {
              count: stats.current_weekly_streak.count,
              startDate: stats.current_weekly_streak.start_date,
              endDate: stats.current_weekly_streak.end_date
            }
          : undefined
      },
      message: `Karma: **${stats.karma || 0}**, completed today: **${stats.completed_today || 0}**.`
    };
  });
