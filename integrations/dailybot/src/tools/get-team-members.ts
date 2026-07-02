import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let getTeamMembers = SlateTool.create(spec, {
  name: 'Get Team Members',
  key: 'get_team_members',
  description: `Retrieve the list of members for a specific team. Returns user details including name, email, role, and timezone for each team member.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamUuid: z.string().describe('UUID of the team')
    })
  )
  .output(
    z.object({
      teamUuid: z.string().describe('UUID of the team'),
      members: z
        .array(
          z.object({
            userUuid: z.string().describe('UUID of the team member'),
            fullName: z.string().describe('Full name of the member'),
            email: z.string().optional().describe('Email address'),
            role: z.string().optional().describe('Organization role')
          })
        )
        .describe('List of team members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let members = await client.listTeamMembers(ctx.input.teamUuid);

    let mapped = members.map((m: any) => ({
      userUuid: m.uuid,
      fullName: m.full_name ?? m.name ?? '',
      email: m.email,
      role: m.role
    }));

    return {
      output: {
        teamUuid: ctx.input.teamUuid,
        members: mapped
      },
      message: `Team has **${mapped.length}** member(s).`
    };
  })
  .build();
