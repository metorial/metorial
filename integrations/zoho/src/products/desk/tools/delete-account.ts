import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../../spec';
import { createClient } from '../lib/helpers';

export let deleteAccount = SlateTool.create(spec, {
  name: 'Desk Delete Account',
  key: 'desk_delete_account',
  description: `Permanently delete a company account by ID. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orgId: z
        .string()
        .optional()
        .describe('Organization ID. Call desk_list_organizations to discover IDs.'),
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
