import { SlateTool } from 'slates';
import { z } from 'zod';
import { getNotionBlockTree } from '../lib/block-tree';
import { NotionClient } from '../lib/client';
import { requireNotionPageId } from '../lib/id';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve a Notion page by page ID or URL, including its properties, metadata, and optionally its complete nested block content.
Use this to read a known page. If you only know its title, call Search first and pass the matching page result's id.`,
  instructions: [
    'Use the pageId returned by Create Page, or the id of a page object returned by Search or Query Database. Never invent a page ID.',
    'If the page is unknown, call Search with filterType "page", then pass the matching results[].id to this tool.',
    'A Notion page URL or compact 32-character page ID is accepted and normalized automatically. For URLs containing ?v=, the v value is a database view ID, not a page ID.',
    'A 404 object_not_found response means the page ID is wrong or the page has not been shared with the connected Notion integration. Search for an accessible page or ask the user to share it with the connection.'
  ],
  constraints: [
    'Page properties return a maximum of 25 references per property. Use the page property endpoint for larger datasets.',
    'With includeContent enabled, nested child blocks are fetched recursively and large pages may require many Notion API requests.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageId: z
        .string()
        .describe(
          'Notion page UUID, compact 32-character page ID, or page URL. Prefer pageId from Create Page or results[].id from Search or Query Database.'
        ),
      includeContent: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to recursively fetch all top-level and nested page content blocks')
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
        .describe(
          'Complete page block tree when includeContent is true; blocks with children include a nested children array'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new NotionClient({ token: ctx.auth.token });
    let pageId = requireNotionPageId(ctx.input.pageId);

    let page = await client.getPage(pageId);

    let blocks: any[] | undefined;
    if (ctx.input.includeContent) {
      blocks = await getNotionBlockTree(client, pageId);
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
