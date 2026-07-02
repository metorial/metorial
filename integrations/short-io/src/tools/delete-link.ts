import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteLink = SlateTool.create(spec, {
  name: 'Delete Link',
  key: 'delete_link',
  description: `Permanently delete a short link. This action cannot be undone. If you want to temporarily disable a link, consider archiving it instead.`,
  constraints: ['Rate limit: 20 requests per second.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      linkId: z.string().describe('The ID of the link to delete (e.g., "lnk_abc123_abcdef").')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful.'),
      linkId: z.string().describe('The ID of the deleted link.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deleteLink(ctx.input.linkId);

    return {
      output: {
        success: result.success,
        linkId: ctx.input.linkId
      },
      message: `Deleted link **${ctx.input.linkId}**`
    };
  })
  .build();
