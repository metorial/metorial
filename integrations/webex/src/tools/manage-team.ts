import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

let teamOutputSchema = z.object({
  teamId: z.string().describe('Unique ID of the team'),
  name: z.string().optional().describe('Name of the team'),
  creatorId: z.string().optional().describe('Person ID of the team creator'),
  created: z.string().optional().describe('Creation timestamp')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all teams the authenticated user belongs to.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      max: z.number().optional().describe('Maximum number of teams to return (default 100)')
    })
  )
  .output(
    z.object({
      teams: z.array(teamOutputSchema).describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.listTeams({ max: ctx.input.max });

    let items = result.items || [];
    let teams = items.map((t: any) => ({
      teamId: t.id,
      name: t.name,
      creatorId: t.creatorId,
      created: t.created
    }));

    return {
      output: { teams },
      message: `Found **${teams.length}** team(s).`
    };
  })
  .build();

export let createTeam = SlateTool.create(spec, {
  name: 'Create Team',
  key: 'create_team',
  description: `Create a new Webex team. A "General" space is automatically created for the team. Use team memberships to add people to the team.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name for the new team')
    })
  )
  .output(teamOutputSchema)
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    let result = await client.createTeam({ name: ctx.input.name });

    return {
      output: {
        teamId: result.id,
        name: result.name,
        creatorId: result.creatorId,
        created: result.created
      },
      message: `Team **${result.name}** created.`
    };
  })
  .build();

export let deleteTeam = SlateTool.create(spec, {
  name: 'Delete Team',
  key: 'delete_team',
  description: `Permanently delete a Webex team. This does not delete the team's spaces, but removes the team grouping.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the team was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    await client.deleteTeam(ctx.input.teamId);

    return {
      output: { deleted: true },
      message: `Team **${ctx.input.teamId}** deleted.`
    };
  })
  .build();
