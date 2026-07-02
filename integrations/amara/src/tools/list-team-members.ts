import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description: `List all members of a team with their roles. Results are paginated.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug'),
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of team members'),
      members: z.array(
        z.object({
          username: z.string().describe('Member username'),
          userId: z.string().describe('Member user ID'),
          role: z.string().describe('Member role in the team')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let result = await client.listTeamMembers(ctx.input.teamSlug, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let members = result.objects.map(m => ({
      username: m.user.username,
      userId: m.user.id,
      role: m.role
    }));

    return {
      output: {
        totalCount: result.meta.total_count,
        members
      },
      message: `Team \`${ctx.input.teamSlug}\` has **${result.meta.total_count}** member(s). Returned ${members.length} results.`
    };
  })
  .build();
