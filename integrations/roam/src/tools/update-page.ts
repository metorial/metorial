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
      pageUid: z.string().describe('Exact target UID for independent reads and recovery'),
      verified: z
        .boolean()
        .describe('Whether the requested outcome was confirmed by an exact read'),
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
      output: {
        success: result.success,
        pageUid: result.targetUid,
        verified: result.verified
      },
      message: 'Updated the page and confirmed its exact UID and title.'
    };
  })
  .build();
