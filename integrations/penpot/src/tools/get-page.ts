import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPageTool = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve the contents of a specific page in a design file, including all objects/shapes on the page. If no pageId is provided, returns the first page.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file'),
      pageId: z
        .string()
        .optional()
        .describe('ID of the specific page to retrieve. If omitted, returns the first page.')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the page'),
      name: z.string().describe('Name of the page'),
      objects: z
        .any()
        .optional()
        .describe('Map of shape objects on the page, keyed by shape ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let page = await client.getPage(ctx.input.fileId, ctx.input.pageId);

    let objectCount = page.objects ? Object.keys(page.objects).length : 0;

    return {
      output: {
        pageId: page.id,
        name: page.name,
        objects: page.objects
      },
      message: `Retrieved page **${page.name}** with **${objectCount}** object(s).`
    };
  })
  .build();
