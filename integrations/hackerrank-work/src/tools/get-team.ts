import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';

import { spec } from '../spec';

export let getTeam = SlateTool.create(spec, {
  key: 'get_team',
  name: 'Get Team',
  description: 'Retrieve a team by ID. Call list_teams to discover available IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      teamId: z.string().describe('Resource ID from list_teams')
    })
  )
  .output(
    z.object({
      team: z.record(z.string(), z.any()).describe('Complete provider resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getTeam(ctx.input.teamId);
    return { message: 'Get team completed.', output: { team: result.data ?? result } };
  });
