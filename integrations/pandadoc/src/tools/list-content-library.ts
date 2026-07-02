import { SlateTool } from 'slates';
import { z } from 'zod';
import { PandaDocClient } from '../lib/client';
import { spec } from '../spec';

export let listContentLibrary = SlateTool.create(spec, {
  name: 'List Content Library',
  key: 'list_content_library',
  description: `List and search content library items in PandaDoc. Content library items are reusable content blocks that can be inserted into documents via content placeholders.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().optional().describe('Search by content library item name'),
      page: z.number().optional().describe('Page number'),
      count: z.number().optional().describe('Items per page')
    })
  )
  .output(
    z.object({
      items: z
        .array(
          z.object({
            contentLibraryItemId: z.string().describe('Content library item UUID'),
            contentLibraryItemName: z.string().describe('Item name'),
            dateCreated: z.string().optional().describe('ISO 8601 creation date'),
            dateModified: z.string().optional().describe('ISO 8601 last modified date')
          })
        )
        .describe('List of content library items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PandaDocClient({
      token: ctx.auth.token,
      authType: ctx.auth.authType
    });

    let params: any = {};
    if (ctx.input.query) params.q = ctx.input.query;
    if (ctx.input.page) params.page = ctx.input.page;
    if (ctx.input.count) params.count = ctx.input.count;

    let result = await client.listContentLibraryItems(params);

    let items = (result.results || result || []).map((item: any) => ({
      contentLibraryItemId: item.id,
      contentLibraryItemName: item.name,
      dateCreated: item.date_created,
      dateModified: item.date_modified
    }));

    return {
      output: { items },
      message: `Found **${items.length}** content library item(s).`
    };
  })
  .build();
