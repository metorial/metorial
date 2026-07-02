import { SlateTool } from 'slates';
import { z } from 'zod';
import { DailyBotClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams in the organization. Returns team names, UUIDs, active status, and whether a team is the default.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamUuid: z.string().describe('UUID of the team'),
            name: z.string().describe('Name of the team'),
            isActive: z.boolean().optional().describe('Whether the team is active'),
            isDefault: z.boolean().optional().describe('Whether this is the default team')
          })
        )
        .describe('List of organization teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DailyBotClient({ token: ctx.auth.token });

    let teams = await client.listTeams();

    let mapped = teams.map((t: any) => ({
      teamUuid: t.uuid,
      name: t.name,
      isActive: t.is_active ?? t.active,
      isDefault: t.is_default
    }));

    return {
      output: { teams: mapped },
      message: `Found **${mapped.length}** team(s).`
    };
  })
  .build();
