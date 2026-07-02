import { SlateTool } from 'slates';
import { z } from 'zod';
import { HelpScoutClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in the Help Scout account. Optionally retrieve the members of a specific team.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamId: z
        .number()
        .optional()
        .describe('If provided, list members of this specific team'),
      page: z.number().optional().describe('Page number (1-based)')
    })
  )
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.number().describe('Team ID'),
            name: z.string().describe('Team name'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            modifiedAt: z.string().optional().describe('Last modified timestamp')
          })
        )
        .optional()
        .describe('List of teams'),
      members: z
        .array(
          z.object({
            userId: z.number().describe('User ID'),
            firstName: z.string().nullable().describe('First name'),
            lastName: z.string().nullable().describe('Last name'),
            email: z.string().describe('Email')
          })
        )
        .optional()
        .describe('Team members (when teamId is provided)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HelpScoutClient(ctx.auth.token);

    if (ctx.input.teamId) {
      let data = await client.listTeamMembers(ctx.input.teamId, { page: ctx.input.page });
      let embedded = data?._embedded?.users ?? [];
      let members = embedded.map((u: any) => ({
        userId: u.id,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        email: u.email
      }));

      return {
        output: { members },
        message: `Team **#${ctx.input.teamId}** has **${members.length}** members.`
      };
    }

    let data = await client.listTeams({ page: ctx.input.page });
    let embedded = data?._embedded?.teams ?? [];
    let teams = embedded.map((t: any) => ({
      teamId: t.id,
      name: t.name,
      createdAt: t.createdAt,
      modifiedAt: t.updatedAt
    }));

    return {
      output: { teams },
      message: `Found **${teams.length}** teams.`
    };
  })
  .build();
