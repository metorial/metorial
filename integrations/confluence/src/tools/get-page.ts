import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPage = SlateTool.create(spec, {
  name: 'Get Page',
  key: 'get_page',
  description: `Retrieve a Confluence page by its ID, with optional body content. Returns page metadata including title, space, version, and status. Use **includeBody** to fetch the full storage-format content.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      pageId: z.string().describe('The ID of the page to retrieve'),
      includeBody: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to include the page body content in storage format')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('The page ID'),
      title: z.string().describe('The page title'),
      status: z.string().describe('The page status (current, draft, trashed, etc.)'),
      spaceId: z.string().optional().describe('The space ID the page belongs to'),
      parentId: z.string().optional().describe('The parent page ID'),
      authorId: z.string().optional().describe('The author account ID'),
      createdAt: z.string().optional().describe('When the page was created'),
      versionNumber: z.number().optional().describe('Current version number'),
      versionMessage: z.string().optional().describe('Version change message'),
      body: z
        .string()
        .optional()
        .describe('Page body in storage format (only if includeBody is true)'),
      webUrl: z.string().optional().describe('Web URL to view the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let page = await client.getPageById(ctx.input.pageId, ctx.input.includeBody);

    return {
      output: {
        pageId: page.id,
        title: page.title,
        status: page.status,
        spaceId: page.spaceId,
        parentId: page.parentId ?? undefined,
        authorId: page.authorId,
        createdAt: page.createdAt,
        versionNumber: page.version?.number,
        versionMessage: page.version?.message,
        body: page.body?.storage?.value,
        webUrl: page._links?.webui
      },
      message: `Retrieved page **${page.title}** (ID: ${page.id}, version ${page.version?.number || 'unknown'})`
    };
  })
  .build();
