import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient } from '../lib/client';
import { spec } from '../spec';

export let deletePage = SlateTool.create(spec, {
  name: 'Delete Page',
  key: 'delete_page',
  description: `Permanently delete a page and all its blocks from the Roam Research graph. An exact read precedes deletion and independently checks absence afterward. The API does not provide undo or erase history, backups or referenced copies. An already absent target returns success false without another delete.`,
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
      pageUid: z.string().describe('Exact target UID for independent reads and recovery'),
      verified: z
        .boolean()
        .describe('Whether the requested outcome was confirmed by an exact read'),
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
      output: {
        success: result.success,
        pageUid: result.targetUid,
        verified: result.verified
      },
      message:
        'Read the exact page deletion outcome; retained history or backups are not erased.'
    };
  })
  .build();
