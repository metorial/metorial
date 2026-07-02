import { SlateTool } from 'slates';
import { z } from 'zod';
import { OpsGenieClient } from '../lib/client';
import { spec } from '../spec';

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description: `Retrieve detailed information about a specific team, including its members and their roles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamIdentifier: z.string().describe('Team ID or name'),
      identifierType: z
        .enum(['id', 'name'])
        .optional()
        .describe('Type of identifier. Defaults to "id"')
    })
  )
  .output(
    z.object({
      teamId: z.string().describe('Team ID'),
      name: z.string().describe('Team name'),
      description: z.string().optional().describe('Team description'),
      members: z
        .array(
          z.object({
            userId: z.string().describe('User ID'),
            username: z.string().optional().describe('Username'),
            role: z.string().describe('Member role')
          })
        )
        .describe('Team members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OpsGenieClient({
      token: ctx.auth.token,
      instance: ctx.config.instance
    });

    let team = await client.getTeam(
      ctx.input.teamIdentifier,
      ctx.input.identifierType ?? 'id'
    );

    let members = (team.members ?? []).map((m: any) => ({
      userId: m.user?.id ?? '',
      username: m.user?.username,
      role: m.role ?? 'user'
    }));

    return {
      output: {
        teamId: team.id,
        name: team.name,
        description: team.description,
        members
      },
      message: `Team **${team.name}** has **${members.length}** members.`
    };
  })
  .build();
