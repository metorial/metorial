import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTeamMembers = SlateTool.create(spec, {
  name: 'List Team Members',
  key: 'list_team_members',
  description: `Retrieve all team members from your Simplesat account. Team members represent agents or employees who can be associated with survey feedback.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number for pagination (starts at 1)'),
      pageSize: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of team members'),
      teamMembers: z.array(
        z.object({
          teamMemberId: z.number().describe('Team member ID'),
          name: z.string().describe('Team member name'),
          email: z.string().describe('Team member email')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listTeamMembers({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let teamMembers = result.results.map(m => ({
      teamMemberId: m.id,
      name: m.name,
      email: m.email
    }));

    return {
      output: {
        totalCount: result.count,
        teamMembers
      },
      message: `Found **${result.count}** team member(s). Returned **${teamMembers.length}** on this page.`
    };
  })
  .build();
