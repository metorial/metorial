import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLink = SlateTool.create(spec, {
  name: 'Delete Short Link',
  key: 'delete_link',
  description: `Permanently delete an existing short link. Once deleted, the short URL will no longer redirect to its destination and the slug becomes available for reuse.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      linkId: z.string().describe('The identifier of the short link to delete.')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the short link was successfully deleted.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deleteLink(ctx.input.linkId);

    return {
      output: {
        deleted: true
      },
      message: `Deleted short link \`${ctx.input.linkId}\``
    };
  })
  .build();
