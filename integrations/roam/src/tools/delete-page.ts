import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let deletePage = SlateTool.create(spec, {
  name: 'Delete Page',
  key: 'delete_page',
  description: `Permanently delete a page and all its blocks from the Roam Research graph. This action cannot be undone via the API.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      pageUid: z.string().describe('UID of the page to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the page was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let result = await client.deletePage(ctx.input.pageUid);

    return {
      output: { success: result.success },
      message: `Page **${ctx.input.pageUid}** deleted from graph **${ctx.config.graphName}**.`
    };
  })
  .build();
