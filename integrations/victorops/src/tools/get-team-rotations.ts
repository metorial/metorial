import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeamRotations = SlateTool.create(spec, {
  name: 'Get Team Rotations',
  key: 'get_team_rotations',
  description: `Get all rotation groups for a team. Rotations define recurring on-call schedules and are referenced by escalation policies to determine who is on-call.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      teamSlug: z.string().describe('Team slug to get rotations for')
    })
  )
  .output(
    z.object({
      rotations: z.array(z.any()).describe('List of rotation groups for the team')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    let data = await client.getTeamRotations(ctx.input.teamSlug);
    let rotations = data?.rotations ?? [];

    return {
      output: { rotations },
      message: `Found **${rotations.length}** rotation(s) for team **${ctx.input.teamSlug}**.`
    };
  })
  .build();
