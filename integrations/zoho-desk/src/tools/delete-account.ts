import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteAccount = SlateTool.create(spec, {
  name: 'Delete Account',
  key: 'delete_account',
  description: `Permanently delete a company account by ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      accountId: z.string().describe('ID of the account to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the account was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteAccount(ctx.input.accountId);

    return {
      output: { deleted: true },
      message: `Deleted account **${ctx.input.accountId}**`
    };
  })
  .build();
