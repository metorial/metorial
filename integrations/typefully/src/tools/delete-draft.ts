import { SlateTool } from 'slates';
import { z } from 'zod';
import { TypefullyClient } from '../lib/client';
import { spec } from '../spec';

export let deleteDraft = SlateTool.create(spec, {
  name: 'Delete Draft',
  key: 'delete_draft',
  description: `Permanently delete a draft from Typefully. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      socialSetId: z.string().describe('ID of the social set'),
      draftId: z.string().describe('ID of the draft to delete')
    })
  )
  .output(
    z.object({
      draftId: z.string().describe('ID of the deleted draft'),
      deleted: z.boolean().describe('Whether the draft was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TypefullyClient(ctx.auth.token);

    await client.deleteDraft(ctx.input.socialSetId, ctx.input.draftId);

    return {
      output: {
        draftId: ctx.input.draftId,
        deleted: true
      },
      message: `Draft \`${ctx.input.draftId}\` has been permanently deleted.`
    };
  })
  .build();
