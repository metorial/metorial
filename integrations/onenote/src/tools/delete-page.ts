import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePage = SlateTool.create(spec, {
  name: 'Delete Page',
  key: 'delete_page',
  description: `Permanently delete a OneNote page. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      pageId: z.string().describe('The ID of the page to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deletePage(ctx.input.pageId);

    return {
      output: {
        success: true
      },
      message: `Deleted page \`${ctx.input.pageId}\`.`
    };
  })
  .build();
