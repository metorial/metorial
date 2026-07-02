import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let updatePage = SlateTool.create(spec, {
  name: 'Update Page',
  key: 'update_page',
  description: `Rename an existing page in the Roam Research graph by updating its title. The page is identified by its UID.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      pageUid: z.string().describe('UID of the page to update'),
      title: z.string().describe('New title for the page')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the page was updated successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let result = await client.updatePage(ctx.input.pageUid, ctx.input.title);

    return {
      output: { success: result.success },
      message: `Page **${ctx.input.pageUid}** renamed to **"${ctx.input.title}"** in graph **${ctx.config.graphName}**.`
    };
  })
  .build();
