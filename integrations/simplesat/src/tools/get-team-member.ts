import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamMember = SlateTool.create(spec, {
  name: 'Get Team Member',
  key: 'get_team_member',
  description: `Look up a team member by their ID. Returns the team member's name and email, useful for associating feedback with specific agents or employees.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamMemberId: z.number().describe('ID of the team member to look up')
    })
  )
  .output(
    z.object({
      teamMemberId: z.number().describe('Team member ID'),
      name: z.string().describe('Team member name'),
      email: z.string().describe('Team member email')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let member = await client.getTeamMember(ctx.input.teamMemberId);

    return {
      output: {
        teamMemberId: member.id,
        name: member.name,
        email: member.email
      },
      message: `Found team member **${member.name}** (${member.email}).`
    };
  })
  .build();
