import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  nullableString,
  optionalNumber,
  rawSchema,
  requiredString,
  responseData,
  responseRecord,
  teamIdSchema
} from '../lib/responses';
import { spec } from '../spec';

export let getTeam = SlateTool.create(spec, {
  name: 'Get Team',
  key: 'get_team',
  description:
    'Get team details, member and channel counts, permissions, and remaining plan limits. Call list_teams to discover the team ID.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ teamId: teamIdSchema }))
  .output(
    z.object({
      teamId: z.string().describe('Team identifier'),
      name: z.string().describe('Team name'),
      picture: z.string().nullable().optional().describe('Team avatar URL'),
      role: z.number().optional().describe('Your provider role code'),
      memberCount: z.number().optional().describe('Number of team members'),
      channelCount: z.number().optional().describe('Number of connected channels'),
      disconnectedChannelCount: z
        .number()
        .optional()
        .describe('Number of disconnected channels'),
      permissions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Enabled plan permissions'),
      limits: z.record(z.string(), z.unknown()).optional().describe('Remaining plan limits'),
      raw: rawSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let team = responseRecord(
      responseData(await client.getTeam(ctx.input.teamId)),
      'team details'
    );
    return {
      output: {
        teamId: requiredString(team.id, 'team ID'),
        name: requiredString(team.name, 'team name'),
        picture: nullableString(team.picture),
        role: optionalNumber(team.role),
        memberCount: optionalNumber(team.members_count),
        channelCount: optionalNumber(team.channels_count),
        disconnectedChannelCount: optionalNumber(team.disconnected_channels_count),
        permissions:
          team.permissions == null
            ? undefined
            : responseRecord(team.permissions, 'team permissions'),
        limits: team.limits == null ? undefined : responseRecord(team.limits, 'team limits'),
        raw: team
      },
      message: `Retrieved team ${requiredString(team.name, 'team name')}.`
    };
  });
