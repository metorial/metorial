import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';

import { spec } from '../spec';

export let removeTeamMember = SlateTool.create(spec, {
  key: 'remove_team_member',
  name: 'Remove Team Member',
  description: 'Remove an existing user from a team.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      teamId: z.string().describe('Team ID from list_teams'),
      userId: z.string().describe('User ID from list_users or list_teams with teamId')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether HackerRank accepted removal')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.removeTeamMember(ctx.input.teamId, ctx.input.userId);
    return { output: { removed: true }, message: 'Removed the team member.' };
  });
