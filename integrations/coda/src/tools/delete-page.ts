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
      deleted: z.boolean().describe('Whether the page was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.deletePage(ctx.input.docId, ctx.input.pageIdOrName);

    return {
      output: {
        deleted: true
      },
      message: `Deleted page **${ctx.input.pageIdOrName}** from doc **${ctx.input.docId}**.`
    };
  })
  .build();
