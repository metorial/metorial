import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createPendoClient, firstPendoRecord } from './helpers';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve a specific tagged page from Pendo by page ID. Returns the page name, rules, and raw page configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.string().describe('The tagged page ID to retrieve')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('Page ID'),
      name: z.string().describe('Page name'),
      raw: z.any().describe('Full raw page record from Pendo')
    })
  )
  .handleInvocation(async ctx => {
    let client = createPendoClient(ctx);
    let page = firstPendoRecord(await client.getPage(ctx.input.pageId));

    return {
      output: {
        pageId: page.id || page.pageId || ctx.input.pageId,
        name: page.name || '',
        raw: page
      },
      message: `Retrieved page **${page.name || ctx.input.pageId}** from Pendo.`
    };
  })
  .build();
