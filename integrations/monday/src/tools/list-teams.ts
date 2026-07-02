import { SlateTool } from 'slates';
import { z } from 'zod';
import { MondayClient } from '../lib/client';
import { spec } from '../spec';

export let listTeamsTool = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve teams from the Monday.com account. Optionally filter by team IDs. Returns team members and owners.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamIds: z.array(z.string()).optional().describe('Specific team IDs to retrieve')
    })
  )
  .output(
    z.object({
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('Team ID'),
            name: z.string().describe('Team name'),
            pictureUrl: z.string().nullable().describe('Team picture URL'),
            owners: z
              .array(
                z.object({
                  userId: z.string().describe('Owner user ID'),
                  name: z.string().describe('Owner name')
                })
              )
              .describe('Team owners'),
            members: z
              .array(
                z.object({
                  userId: z.string().describe('Member user ID'),
                  name: z.string().describe('Member name')
                })
              )
              .describe('Team members')
          })
        )
        .describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MondayClient({ token: ctx.auth.token });
    let teams = await client.getTeams(ctx.input.teamIds);

    let mapped = teams.map((t: any) => ({
      teamId: String(t.id),
      name: t.name,
      pictureUrl: t.picture_url || null,
      owners: (t.owners || []).map((o: any) => ({
        userId: String(o.id),
        name: o.name
      })),
      members: (t.users || []).map((u: any) => ({
        userId: String(u.id),
        name: u.name
      }))
    }));

    return {
      output: { teams: mapped },
      message: `Found **${mapped.length}** team(s).`
    };
  })
  .build();
