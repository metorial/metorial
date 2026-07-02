import { SlateTool } from 'slates';
import { z } from 'zod';
import { NotionClient } from '../lib/client';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve a Notion page by its ID, including all properties, metadata, and optionally its content blocks.
Use this to read a page's title, properties, timestamps, parent info, icon, cover, and block content.`,
  constraints: [
    'Page properties return a maximum of 25 references per property. Use the page property endpoint for larger datasets.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z.string().describe('ID of the page to retrieve'),
      includeContent: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch the page content blocks')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('ID of the page'),
      url: z.string().optional().describe('URL of the page'),
      createdTime: z.string().optional().describe('When the page was created'),
      lastEditedTime: z.string().optional().describe('When the page was last edited'),
      archived: z.boolean().optional().describe('Whether the page is archived'),
      inTrash: z.boolean().optional().describe('Whether the page is in trash'),
      isLocked: z.boolean().optional().describe('Whether the page is locked'),
      icon: z.any().optional().describe('Page icon'),
      cover: z.any().optional().describe('Page cover image'),
      parent: z.any().optional().describe('Parent reference'),
      properties: z.record(z.string(), z.any()).optional().describe('Page properties'),
      blocks: z
        .array(z.any())
        .optional()
        .describe('Page content blocks (if includeContent is true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });

    let page = await client.getPage(ctx.input.pageId);

    let blocks: any[] | undefined;
    if (ctx.input.includeContent) {
      let result = await client.getBlockChildren(ctx.input.pageId);
      blocks = result.results;

      while (result.has_more && result.next_cursor) {
        result = await client.getBlockChildren(ctx.input.pageId, result.next_cursor);
        blocks.push(...result.results);
      }
    }

    let title = extractTitle(page.properties);

    return {
      output: {
        pageId: page.id,
        url: page.url,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
        archived: page.archived,
        inTrash: page.in_trash,
        isLocked: page.is_locked,
        icon: page.icon,
        cover: page.cover,
        parent: page.parent,
        properties: page.properties,
        blocks
      },
      message: `Retrieved page${title ? ` **${title}**` : ''} (${page.id})${page.url ? ` — [Open in Notion](${page.url})` : ''}`
    };
  })
  .build();

let extractTitle = (properties: Record<string, any> | undefined): string | undefined => {
  if (!properties) return undefined;
  for (let key of Object.keys(properties)) {
    let prop = properties[key];
    if (prop?.type === 'title' && Array.isArray(prop.title)) {
      return prop.title.map((t: any) => t.plain_text ?? '').join('');
    }
  }
  return undefined;
};
