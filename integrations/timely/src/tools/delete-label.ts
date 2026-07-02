import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteLabel = SlateTool.create(spec, {
  name: 'Delete Label',
  key: 'delete_label',
  description: `Permanently delete a label from Timely. This cannot be undone. Consider archiving (via Manage Label with active=false) instead.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      labelId: z.string().describe('ID of the label to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    await client.deleteLabel(ctx.input.labelId);

    return {
      output: { deleted: true },
      message: `Deleted label **#${ctx.input.labelId}**.`
    };
  })
  .build();
