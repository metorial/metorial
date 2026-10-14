import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { resolveTeamId, teamIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description:
    'Retrieve a team’s current usage and plan limits. Call list_teams to discover accessible team IDs.',
  tags: { readOnly: true }
})
  .input(z.object({ teamId: teamIdSchema }))
  .output(
    z.object({
      teamId: z.string().describe('Team identifier'),
      name: z.string().describe('Team name'),
      status: z.string().describe('Team status'),
      createdAt: z.string().describe('Team creation timestamp'),
      botCount: z.number().describe('Current bot count'),
      sourceCount: z.number().describe('Current source count'),
      pageCount: z.number().describe('Indexed page count'),
      chunkCount: z.number().describe('Indexed chunk count'),
      questionCount: z.number().describe('AI credits used in the current billing period'),
      plan: z.object({
        name: z.string(),
        bots: z.number(),
        sources: z.number(),
        pages: z.number(),
        questions: z.number().describe('Included monthly AI credits')
      })
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let team = await client.getTeam(resolveTeamId(ctx.input.teamId, ctx.config.teamId));
    return {
      output: {
        teamId: team.id,
        name: team.name,
        status: team.status,
        createdAt: team.createdAt,
        botCount: team.botCount,
        sourceCount: team.sourceCount,
        pageCount: team.pageCount,
        chunkCount: team.chunkCount,
        questionCount: team.questionCount,
        plan: team.plan
      },
      message: `Retrieved team **${team.name}** (${team.plan.name} plan)`
    };
  })
  .build();
