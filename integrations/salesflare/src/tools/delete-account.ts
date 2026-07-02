import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteAccount = SlateTool.create(spec, {
  name: 'Delete Account',
  key: 'delete_account',
  description: `Delete an account from Salesflare. **Warning:** Deleting an account also removes all linked opportunities and tasks.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    await client.deleteAccount(ctx.input.accountId);

    return {
      output: { success: true },
      message: `Deleted account **${ctx.input.accountId}**.`
    };
  })
  .build();
