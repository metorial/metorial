import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let deleteTeam = SlateTool.create(spec, {
  name: 'Delete Team',
  key: 'delete_team',
  description: `Permanently delete a Microsoft Team and its associated Microsoft 365 group. This action is irreversible.`,
  tags: {
    destructive: true
  }
})
  .scopes(microsoftTeamsActionScopes.deleteTeam)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });
    await client.deleteTeam(ctx.input.teamId);

    return {
      output: { success: true },
      message: `Team deleted successfully.`
    };
  })
  .build();
