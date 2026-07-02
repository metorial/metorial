import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let revokeRestoreMember = SlateTool.create(spec, {
  name: 'Revoke or Restore Member',
  key: 'revoke_restore_member',
  description: `Revoke or restore organization access for a member. Revoking suspends the member's access without removing them; restoring re-enables their access.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      memberId: z.string().describe('ID of the member'),
      action: z
        .enum(['revoke', 'restore'])
        .describe("Whether to revoke or restore the member's access")
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('ID of the member'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverUrl: ctx.auth.serverUrl
    });

    if (ctx.input.action === 'revoke') {
      await client.revokeMember(ctx.input.memberId);
    } else {
      await client.restoreMember(ctx.input.memberId);
    }

    return {
      output: {
        memberId: ctx.input.memberId,
        action: ctx.input.action,
        success: true
      },
      message: `Member **${ctx.input.memberId}** has been **${ctx.input.action}d**.`
    };
  })
  .build();
