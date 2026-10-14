import { SlateTool } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description:
    'List Capsule CRM teams and their IDs for assigning contacts, opportunities, or projects. Optionally include team memberships.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      embed: z
        .array(z.enum(['memberships']))
        .optional()
        .describe('Include team memberships')
    })
  )
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.number(),
          name: z.string(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          memberships: z.array(z.any()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new CapsuleClient({ token: ctx.auth.token });
    let result = await client.listTeams(ctx.input.embed);
    let teams = (result.teams ?? []).map((team: any) => ({
      teamId: team.id,
      name: team.name,
      createdAt: team.createdAt ?? undefined,
      updatedAt: team.updatedAt ?? undefined,
      memberships: team.memberships ?? undefined
    }));
    return {
      output: { teams },
      message: `Found **${teams.length}** teams.`
    };
  })
  .build();
