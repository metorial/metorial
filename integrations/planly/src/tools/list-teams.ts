import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: z.string().describe('Unique team identifier'),
  name: z.string().describe('Team name'),
  picture: z.string().nullable().optional().describe('Team avatar URL'),
  role: z.string().optional().describe('Your role in this team'),
  userCount: z.number().optional().describe('Number of team members'),
  channelCount: z.number().optional().describe('Number of connected channels')
});

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `Retrieve all teams you belong to. Returns team details including name, your role, and counts of members and channels. Use this to find a teamId for other operations.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      teams: z.array(teamSchema).describe('List of teams')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTeams();
    let teams = (result.data || result || []).map((t: any) => ({
      teamId: t.id,
      name: t.name,
      picture: t.picture || null,
      role: t.role,
      userCount: t.users,
      channelCount: t.channels
    }));

    return {
      output: { teams },
      message: `Found ${teams.length} team(s).`
    };
  });
