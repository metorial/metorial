import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let deleteTag = SlateTool.create(spec, {
  name: 'Delete Tag',
  key: 'delete_tag',
  description: `Delete a contact tag by its ID. Tags are shared across all lists. Removing a tag will unassign it from all contacts.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      tagId: z.number().describe('ID of the tag to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    await client.deleteTag(ctx.input.tagId);

    return {
      output: { success: true },
      message: `Deleted tag \`${ctx.input.tagId}\``
    };
  })
  .build();
