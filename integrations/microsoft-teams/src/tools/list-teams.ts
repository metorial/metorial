import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List all Microsoft Teams that the authenticated user has joined. Returns basic team properties including display name, description, and visibility.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(
        z.object({
          teamId: z.string().describe('Unique identifier of the team'),
          displayName: z.string().describe('Display name of the team'),
          description: z.string().nullable().describe('Description of the team'),
          isArchived: z.boolean().optional().describe('Whether the team is archived')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    let teams = await client.listJoinedTeams();

    let mapped = teams.map((t: any) => ({
      teamId: t.id,
      displayName: t.displayName,
      description: t.description,
      isArchived: t.isArchived
    }));

    return {
      output: { teams: mapped },
      message: `Found **${mapped.length}** teams the user has joined.`
    };
  })
  .build();
