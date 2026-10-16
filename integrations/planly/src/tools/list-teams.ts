import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  nullableString,
  optionalNumber,
  rawSchema,
  requiredString,
  responseArray,
  responseData,
  responseRecord,
  scalarString,
  teamIdSchema
} from '../lib/responses';
import { spec } from '../spec';

let teamSchema = z.object({
  teamId: teamIdSchema,
  name: z.string().describe('Team name'),
  picture: z.string().nullable().optional().describe('Team avatar URL'),
  role: z.string().optional().describe('Your role in this team'),
  userCount: z.number().optional().describe('Number of team members'),
  channelCount: z.number().optional().describe('Number of connected channels'),
  raw: rawSchema
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
    let teams = responseArray(responseData(result), 'teams').map(value => {
      let team = responseRecord(value, 'team');
      return {
        teamId: requiredString(team.id, 'team ID'),
        name: requiredString(team.name, 'team name'),
        picture: nullableString(team.picture),
        role: scalarString(team.role),
        userCount: optionalNumber(team.users),
        channelCount: optionalNumber(team.channels),
        raw: team
      };
    });
    return { output: { teams }, message: `Found ${teams.length} team(s).` };
  });
