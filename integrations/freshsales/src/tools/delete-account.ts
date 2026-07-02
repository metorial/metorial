import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteAccount = SlateTool.create(spec, {
  name: 'Delete Account',
  key: 'delete_account',
  description: `Delete an account (company) from Freshsales by its ID. This action is permanent.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.number().describe('ID of the account to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteAccount(ctx.input.accountId);

    return {
      output: { deleted: true },
      message: `Account **${ctx.input.accountId}** deleted successfully.`
    };
  })
  .build();
