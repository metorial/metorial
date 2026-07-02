import { SlateTool } from 'slates';
import { z } from 'zod';
import { LastPassClient } from '../lib/client';
import { spec } from '../spec';

export let deprovisionUser = SlateTool.create(spec, {
  name: 'Deprovision User',
  key: 'deprovision_user',
  description: `Remove or deactivate a user from the LastPass Enterprise account. Choose between deactivating (blocks login, retains data), removing (removes from enterprise but keeps personal account), or fully deleting the account.`,
  instructions: [
    'Use action **deactivate** to block logins while retaining all data.',
    'Use action **remove** to remove from enterprise but keep the personal account active.',
    'Use action **delete** to completely delete the user account and all data.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      username: z.string().describe('Email address of the user to deprovision'),
      action: z
        .enum(['deactivate', 'remove', 'delete'])
        .default('deactivate')
        .describe(
          'Deprovision action: deactivate (block login), remove (leave enterprise), or delete (full removal)'
        )
    })
  )
  .output(
    z.object({
      status: z.string().describe('API response status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LastPassClient({
      companyId: ctx.auth.companyId,
      provisioningHash: ctx.auth.provisioningHash
    });

    let actionMap: Record<string, 0 | 1 | 2> = {
      deactivate: 0,
      remove: 1,
      delete: 2
    };

    let deleteAction = actionMap[ctx.input.action] ?? 0;
    let result = await client.deleteUser(ctx.input.username, deleteAction);

    let actionLabel = ctx.input.action.charAt(0).toUpperCase() + ctx.input.action.slice(1);

    return {
      output: {
        status: result.status || 'OK'
      },
      message: `${actionLabel}d user **${ctx.input.username}** successfully.`
    };
  })
  .build();
