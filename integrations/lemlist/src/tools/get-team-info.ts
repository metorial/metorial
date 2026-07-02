import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamInfo = SlateTool.create(spec, {
  name: 'Get Team Info',
  key: 'get_team_info',
  description: `Retrieve team information including team name, members, credit balance, and sender details. Provides a comprehensive overview of the team's account and available resources.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teamId: z.string(),
      teamName: z.string().optional(),
      userIds: z.array(z.string()).optional(),
      createdAt: z.string().optional(),
      credits: z.number().optional(),
      creditDetails: z
        .object({
          remaining: z.number().optional(),
          freemium: z.number().optional(),
          subscription: z.number().optional(),
          gifted: z.number().optional(),
          paid: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let [team, credits] = await Promise.all([
      client.getTeam(),
      client.getTeamCredits().catch(() => null)
    ]);

    return {
      output: {
        teamId: team._id,
        teamName: team.name,
        userIds: team.userIds,
        createdAt: team.createdAt,
        credits: credits?.credits,
        creditDetails: credits?.details?.remaining
          ? {
              remaining: credits.details.remaining.total,
              freemium: credits.details.remaining.freemium,
              subscription: credits.details.remaining.subscription,
              gifted: credits.details.remaining.gifted,
              paid: credits.details.remaining.paid
            }
          : undefined
      },
      message: `Team **"${team.name}"** with ${team.userIds?.length ?? 0} member(s)${credits ? ` and **${credits.credits}** credits remaining` : ''}.`
    };
  })
  .build();
