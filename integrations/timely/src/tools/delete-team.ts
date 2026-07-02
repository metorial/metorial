import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTeam = SlateTool.create(spec, {
  name: 'Delete Team',
  key: 'delete_team',
  description: `Permanently delete a team from Timely. This removes the team but does not remove its members from the account.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      teamId: z.string().describe('ID of the team to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    await client.deleteTeam(ctx.input.teamId);

    return {
      output: { deleted: true },
      message: `Deleted team **#${ctx.input.teamId}**.`
    };
  })
  .build();
