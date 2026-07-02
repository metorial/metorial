import { SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

export let manageUser = SlateTool.create(spec, {
  name: 'Manage User',
  key: 'manage_user',
  description: `Perform administrative actions on a LastPass user account. Reset the master password, disable multifactor authentication, or disable the user account.`,
  instructions: [
    'Use **resetPassword** to trigger a master password reset email for the user.',
    'Use **disableMultifactor** to remove multifactor authentication from the user.',
    'Use **disableAccount** to disable the user account (block logins).',
    'You can combine multiple actions in a single call.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Email address of the user'),
      resetPassword: z
        .boolean()
        .optional()
        .describe('Trigger a master password reset for this user'),
      disableMultifactor: z
        .boolean()
        .optional()
        .describe('Disable multifactor authentication for this user'),
      disableAccount: z
        .boolean()
        .optional()
        .describe('Disable the user account (block logins)')
    })
  )
  .output(
    z.object({
      results: z
        .array(
          z.object({
            action: z.string().describe('Action performed'),
            status: z.string().describe('Result status')
          })
        )
        .describe('Results of each action performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LastPassClient({
      companyId: ctx.auth.companyId,
      provisioningHash: ctx.auth.provisioningHash
    });

    let results: Array<{ action: string; status: string }> = [];

    if (ctx.input.resetPassword) {
      let result = await client.resetPassword(ctx.input.username);
      results.push({ action: 'resetPassword', status: result.status || 'OK' });
    }

    if (ctx.input.disableMultifactor) {
      let result = await client.disableMultifactor(ctx.input.username);
      results.push({ action: 'disableMultifactor', status: result.status || 'OK' });
    }

    if (ctx.input.disableAccount) {
      let result = await client.disableUser(ctx.input.username);
      results.push({ action: 'disableAccount', status: result.status || 'OK' });
    }

    if (results.length === 0) {
      throw new Error(
        'No actions specified. Set at least one of: resetPassword, disableMultifactor, disableAccount.'
      );
    }

    let actionNames = results.map(r => r.action).join(', ');

    return {
      output: { results },
      message: `Performed action(s) **${actionNames}** on user **${ctx.input.username}**.`
    };
  })
  .build();
