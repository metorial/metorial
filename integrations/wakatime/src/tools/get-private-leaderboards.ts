import { SlateTool } from 'slates';
import { z } from 'zod';
import { WakaTimeClient } from '../lib/client';
import { spec } from '../spec';

export let getPrivateLeaderboards = SlateTool.create(spec, {
  name: 'Get Private Leaderboards',
  key: 'get_private_leaderboards',
  description: `List all private leaderboards the user has access to. Use the leaderboard ID with the "Get Leaderboard" tool to view rankings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      leaderboards: z
        .array(
          z
            .object({
              leaderboardId: z.string().describe('Leaderboard ID'),
              name: z.string().describe('Leaderboard name'),
              membersCount: z.number().optional().describe('Number of members'),
              createdAt: z.string().optional().describe('When the leaderboard was created'),
              modifiedAt: z
                .string()
                .optional()
                .describe('When the leaderboard was last modified')
            })
            .passthrough()
        )
        .describe('List of private leaderboards'),
      totalLeaderboards: z.number().describe('Total number of private leaderboards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WakaTimeClient({ token: ctx.auth.token });

    let leaderboards = await client.getPrivateLeaderboards();

    let mapped = (leaderboards || []).map((lb: any) => ({
      leaderboardId: lb.id ?? '',
      name: lb.name ?? '',
      membersCount: lb.members_count,
      createdAt: lb.created_at,
      modifiedAt: lb.modified_at
    }));

    return {
      output: {
        leaderboards: mapped,
        totalLeaderboards: mapped.length
      },
      message: `Found **${mapped.length}** private leaderboard(s).`
    };
  })
  .build();
