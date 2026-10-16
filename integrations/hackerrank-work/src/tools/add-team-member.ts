import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';

import { spec } from '../spec';

export let addTeamMember = SlateTool.create(spec, {
  key: 'add_team_member',
  name: 'Add Team Member',
  description:
    'Add an existing user to a team. Locked users require a license to be unlocked.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID from list_teams'),
      userId: z.string().describe('User ID from list_users'),
      license: z
        .enum(['recruiter', 'developer', 'interviewer'])
        .optional()
        .describe('License used to unlock a locked user; omit for an active user')
    })
  )
  .output(
    z.object({
      membership: z.record(z.string(), z.any()).describe('Created team membership')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addTeamMember(
      ctx.input.teamId,
      ctx.input.userId,
      ctx.input.license
    );
    return {
      message: 'Add team member completed.',
      output: { membership: result.data ?? result }
    };
  });
