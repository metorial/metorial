import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description: `Retrieve the BoxHero team linked to the current API token. Returns the team ID, name, and operating mode (0 = Basic Mode, other values = Business/Location Mode). Useful for determining which transaction endpoints and features are available.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teamId: z.number().describe('Unique team ID'),
      teamName: z.string().describe('Team display name'),
      mode: z
        .number()
        .describe('Team operating mode (0 = Basic Mode, other = Business Mode with locations)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let team = await client.getTeam();

    let modeLabel = team.mode === 0 ? 'Basic Mode' : 'Business Mode';

    return {
      output: {
        teamId: team.id,
        teamName: team.name,
        mode: team.mode
      },
      message: `Team **${team.name}** (ID: ${team.id}) is operating in **${modeLabel}**.`
    };
  })
  .build();
