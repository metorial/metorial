import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

export const deleteTeam = SlateTool.create(spec, {
  key: 'delete_team',
  name: 'Delete Team',
  description:
    'Delete an organization team and its access grants. The automatically managed Owners team cannot be deleted.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      teamId: z.number().int().min(1).describe('Team ID returned by list_teams or create_team')
    })
  )
  .output(z.object({ deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    await new GiteaClient(ctx.auth).deleteTeam(ctx.input.teamId);
    return { output: { deleted: true }, message: `Deleted team **#${ctx.input.teamId}**.` };
  })
  .build();
