import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let userActions = SlateTool.create(spec, {
  name: 'User Actions',
  key: 'user_actions',
  description: `Perform administrative actions on a JumpCloud user account. Supports resetting MFA enrollment (forces re-enrollment on next login) and unlocking a locked-out user account.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      userId: z.string().describe('JumpCloud user ID'),
      action: z
        .enum(['reset_mfa', 'unlock'])
        .describe(
          'Action to perform: "reset_mfa" clears MFA enrollment, "unlock" unlocks a locked account'
        )
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID the action was performed on'),
      action: z.string().describe('Action that was performed'),
      success: z.boolean().describe('Whether the action was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    if (ctx.input.action === 'reset_mfa') {
      await client.resetUserMfa(ctx.input.userId);
    } else {
      await client.unlockUser(ctx.input.userId);
    }

    let actionLabel = ctx.input.action === 'reset_mfa' ? 'MFA reset' : 'Account unlock';

    return {
      output: {
        userId: ctx.input.userId,
        action: ctx.input.action,
        success: true
      },
      message: `**${actionLabel}** completed successfully for user \`${ctx.input.userId}\`.`
    };
  })
  .build();
