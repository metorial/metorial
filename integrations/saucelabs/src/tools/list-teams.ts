import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.string().describe('Team UUID'),
  name: z.string().optional().describe('Team name'),
  description: z.string().optional().describe('Team description'),
  orgId: z.string().optional().describe('Organization UUID'),
  userCount: z.number().optional().describe('Number of members'),
  virtualMachines: z.number().optional().describe('Allocated virtual machine concurrency'),
  createdAt: z.string().optional().describe('Team creation time')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve the teams in your Sauce Labs organization. Optionally filter by team name. Shows membership counts and concurrency allocations.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter by team name')
    })
  )
  .output(
    z.object({
      teams: z.array(teamSchema).describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listTeams({ name: ctx.input.name });

    let teamsRaw = result.teams ?? [];
    let teams = teamsRaw.map((t: any) => ({
      teamId: t.id,
      name: t.name,
      description: t.description,
      orgId: t.org_uuid,
      userCount: t.user_count,
      virtualMachines: t.settings?.virtual_machines,
      createdAt: t.created_at
    }));

    return {
      output: { teams },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();
