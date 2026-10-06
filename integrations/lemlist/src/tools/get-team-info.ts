import { SlateTool } from 'slates';
import { z } from 'zod';
import {
  Client,
  optionalNumber,
  optionalStrings,
  optionalText,
  row,
  text
} from '../lib/client';
import { spec } from '../spec';

export let getTeamInfo = SlateTool.create(spec, {
  name: 'Get Team Info',
  key: 'get_team_info',
  description: `Identify the team authenticated by this API key and retrieve its member IDs, creation metadata and available credit balance.`,
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
    const client = new Client({ token: ctx.auth.token });
    const team = await client.getTeam(),
      credits = await client.getTeamCredits();
    const remaining = credits.details == null ? undefined : row(credits.details).remaining;
    const detail = remaining == null ? undefined : row(remaining);
    return {
      output: {
        teamId: text(team._id),
        teamName: optionalText(team.name),
        userIds: optionalStrings(team.userIds),
        createdAt: optionalText(team.createdAt),
        credits: optionalNumber(credits.credits),
        creditDetails: detail
          ? {
              remaining: optionalNumber(detail.total),
              freemium: optionalNumber(detail.freemium),
              subscription: optionalNumber(detail.subscription),
              gifted: optionalNumber(detail.gifted),
              paid: optionalNumber(detail.paid)
            }
          : undefined
      },
      message: 'Retrieved authenticated team identity and available credit metadata.'
    };
  })
  .build();
