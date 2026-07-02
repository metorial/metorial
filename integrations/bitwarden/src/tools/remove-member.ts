import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeMember = SlateTool.create(spec, {
  name: 'Remove Member',
  key: 'remove_member',
  description: `Remove a member from the Bitwarden organization. This revokes their access to all shared collections but does not delete their Bitwarden user account.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      memberId: z.string().describe('ID of the member to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the member was successfully removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    await client.removeMember(ctx.input.memberId);

    return {
      output: { removed: true },
      message: `Removed member **${ctx.input.memberId}** from the organization.`
    };
  })
  .build();
