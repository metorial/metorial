import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deletePageTool = SlateTool.create(spec, {
  name: 'Delete Page',
  key: 'delete_page',
  description: `Permanently delete a page from a Coda doc. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      docId: z.string().describe('ID of the doc'),
      pageIdOrName: z.string().describe('ID or name of the page to delete')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('ID to track the asynchronous page deletion'),
      pageId: z.string().describe('ID of the page queued for deletion'),
      deleted: z.boolean().describe('Whether the delete was successfully queued')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.deletePage(ctx.input.docId, ctx.input.pageIdOrName);

    return {
      output: {
        requestId: result.requestId,
        pageId: result.id,
        deleted: true
      },
      message: `Queued deletion of page **${ctx.input.pageIdOrName}** from doc **${ctx.input.docId}**. Request ID: ${result.requestId}`
    };
  })
  .build();
