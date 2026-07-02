import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteDraft = SlateTool.create(spec, {
  name: 'Delete Draft',
  key: 'delete_draft',
  description: `Delete an email draft from an inbox. This permanently removes the draft.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox containing the draft'),
      draftId: z.string().describe('ID of the draft to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the draft was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });
    await client.deleteDraft(ctx.input.inboxId, ctx.input.draftId);

    return {
      output: { deleted: true },
      message: `Deleted draft **${ctx.input.draftId}**.`
    };
  })
  .build();
