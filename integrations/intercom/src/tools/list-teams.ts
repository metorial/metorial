import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { numberOrUndefined, stringOrUndefined } from '../lib/output';
import { spec } from '../spec';

export let listTeams = SlateTool.create(spec, {
  name: 'List Teams',
  key: 'list_teams',
  description: `List Intercom teams or retrieve a single team by ID. Teams are used as assignment targets for conversations and tickets.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      teamId: z.string().optional().describe('Team ID to retrieve. Omit to list all teams.')
    })
  )
  .output(
    z.object({
      team: z
        .object({
          teamId: z.string().describe('Team ID'),
          name: z.string().optional().describe('Team name'),
          adminIds: z.array(z.string()).optional().describe('Admin IDs on the team'),
          assignmentLimit: z.number().optional().describe('Assignment limit'),
          distributionMethod: z.string().optional().describe('Assignment distribution method')
        })
        .optional()
        .describe('Retrieved team when teamId is provided'),
      teams: z
        .array(
          z.object({
            teamId: z.string().describe('Team ID'),
            name: z.string().optional().describe('Team name'),
            adminIds: z.array(z.string()).optional().describe('Admin IDs on the team'),
            assignmentLimit: z.number().optional().describe('Assignment limit'),
            distributionMethod: z
              .string()
              .optional()
              .describe('Assignment distribution method')
          })
        )
        .optional()
        .describe('Teams in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    if (ctx.input.teamId) {
      let result = await client.getTeam(ctx.input.teamId);
      let team = mapTeam(result);
      if (!team.teamId) throw intercomServiceError('Intercom returned a team without an ID');

      return {
        output: { team },
        message: `Retrieved team **${team.name || team.teamId}**`
      };
    }

    let result = await client.listTeams();
    let teams = (result.teams || []).map(mapTeam);

    return {
      output: { teams },
      message: `Found **${teams.length}** teams`
    };
  })
  .build();

let mapTeam = (data: any) => ({
  teamId: data.id !== undefined && data.id !== null ? String(data.id) : '',
  name: stringOrUndefined(data.name),
  adminIds: (data.admin_ids || []).map((id: string | number) => String(id)),
  assignmentLimit: numberOrUndefined(data.assignment_limit),
  distributionMethod: stringOrUndefined(data.distribution_method)
});
