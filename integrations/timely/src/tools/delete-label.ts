import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let deleteLabel = SlateTool.create(spec, {
  name: 'Delete Label',
  key: 'delete_label',
  description: `Call list_accounts to choose a workspace when needed. Permanently delete a label from Timely. This cannot be undone. Consider archiving (via Manage Label with active=false) instead.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      labelId: z.string().describe('ID of the label to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = await createTimelyClient(ctx);

    await client.deleteLabel(ctx.input.labelId);

    return {
      output: { deleted: true },
      message: `Deleted label **#${ctx.input.labelId}**.`
    };
  })
  .build();
