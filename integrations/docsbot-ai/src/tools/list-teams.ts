import { SlateTool } from 'slates';
import { z } from 'zod';
import { DocsBotAdminClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve all teams accessible with the current API key. Returns team details including name, status, plan info, and usage statistics (bot count, source count, question count).`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string().describe('Unique team identifier'),
          name: z.string().describe('Team display name'),
          status: z.string().describe('Team status (e.g. "ready")'),
          createdAt: z.string().describe('ISO 8601 creation timestamp'),
          botCount: z.number().describe('Number of bots in the team'),
          sourceCount: z.number().describe('Total number of sources'),
          questionCount: z.number().describe('Total messages processed'),
          pageCount: z.number().describe('Total pages crawled'),
          chunkCount: z.number().describe('Total text chunks indexed'),
          planName: z.string().describe('Subscription plan name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new DocsBotAdminClient(ctx.auth.token);
    let teams = await client.listTeams();

    let mapped = teams.map(t => ({
      teamId: t.id,
      name: t.name,
      status: t.status,
      createdAt: t.createdAt,
      botCount: t.botCount,
      sourceCount: t.sourceCount,
      questionCount: t.questionCount,
      pageCount: t.pageCount,
      chunkCount: t.chunkCount,
      planName: t.plan.name
    }));

    return {
      output: { teams: mapped },
      message: `Found **${mapped.length}** team(s): ${mapped.map(t => `**${t.name}** (${t.planName} plan, ${t.botCount} bots)`).join(', ')}`
    };
  })
  .build();
