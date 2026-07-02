import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getLeaderboard = SlateTool.create(spec, {
  name: 'Get Leaderboard',
  key: 'get_leaderboard',
  description: `Access public or private leaderboards of users ranked by coding activity. The public leaderboard can be filtered by language, country, or hireable status. For private leaderboards, provide the leaderboard ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      leaderboardId: z
        .string()
        .optional()
        .describe('Private leaderboard ID. Leave empty for the public leaderboard.'),
      language: z.string().optional().describe('Filter by programming language'),
      country: z
        .string()
        .optional()
        .describe('Filter by country code (public leaderboard only)'),
      hireable: z
        .boolean()
        .optional()
        .describe('Filter by hireable status (public leaderboard only)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      currentUser: z
        .object({
          rank: z.number().optional().describe('Current user rank'),
          runningTotal: z
            .object({
              totalSeconds: z.number().describe('Total coding seconds'),
              humanReadableTotal: z.string().describe('Human-readable total time'),
              dailyAverage: z.number().optional().describe('Daily average in seconds'),
              languages: z
                .array(
                  z.object({
                    name: z.string(),
                    totalSeconds: z.number()
                  })
                )
                .optional()
                .describe('Language breakdown')
            })
            .passthrough()
            .optional()
        })
        .passthrough()
        .optional()
        .describe('Current user position on the leaderboard'),
      leaders: z
        .array(
          z
            .object({
              rank: z.number().describe('Rank on the leaderboard'),
              userId: z.string().optional().describe('User ID'),
              displayName: z.string().optional().describe('Display name'),
              username: z.string().optional().describe('Username'),
              photoUrl: z.string().optional().describe('User photo URL'),
              totalSeconds: z.number().optional().describe('Total coding time in seconds'),
              humanReadableTotal: z.string().optional().describe('Human-readable total time'),
              dailyAverage: z.number().optional().describe('Daily average in seconds'),
              languages: z
                .array(
                  z.object({
                    name: z.string(),
                    totalSeconds: z.number()
                  })
                )
                .optional()
                .describe('Top languages')
            })
            .passthrough()
        )
        .describe('Ranked list of users'),
      totalPages: z.number().optional().describe('Total pages available'),
      currentPage: z.number().optional().describe('Current page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.leaderboardId) {
      result = await client.getPrivateLeaderboard(ctx.input.leaderboardId, {
        language: ctx.input.language,
        page: ctx.input.page
      });
    } else {
      result = await client.getPublicLeaderboard({
        language: ctx.input.language,
        country: ctx.input.country,
        page: ctx.input.page,
        hireable: ctx.input.hireable
      });
    }

    let mapUser = (u: any) => ({
      rank: u.rank ?? 0,
      userId: u.user?.id,
      displayName: u.user?.display_name || u.user?.username,
      username: u.user?.username,
      photoUrl: u.user?.photo,
      totalSeconds: u.running_total?.total_seconds,
      humanReadableTotal: u.running_total?.human_readable_total,
      dailyAverage: u.running_total?.daily_average,
      languages: u.running_total?.languages?.map((l: any) => ({
        name: l.name,
        totalSeconds: l.total_seconds
      }))
    });

    let currentUser = result.current_user
      ? {
          rank: result.current_user.rank,
          runningTotal: result.current_user.running_total
            ? {
                totalSeconds: result.current_user.running_total.total_seconds ?? 0,
                humanReadableTotal:
                  result.current_user.running_total.human_readable_total ?? '0 secs',
                dailyAverage: result.current_user.running_total.daily_average,
                languages: result.current_user.running_total.languages?.map((l: any) => ({
                  name: l.name,
                  totalSeconds: l.total_seconds
                }))
              }
            : undefined
        }
      : undefined;

    let leaders = (result.data || []).map(mapUser);

    return {
      output: {
        currentUser,
        leaders,
        totalPages: result.total_pages,
        currentPage: result.page
      },
      message: `Retrieved leaderboard with **${leaders.length}** entries.${currentUser?.rank ? ` Your rank: **#${currentUser.rank}**.` : ''}`
    };
  })
  .build();
