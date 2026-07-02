import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createPage = SlateTool.create(spec, {
  name: 'Create Page',
  key: 'create_page',
  description: `Create a new Confluence page in a specified space. The body should be in Confluence storage format (XHTML-based). Optionally set a parent page to create hierarchical content.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      spaceId: z.string().describe('The space ID to create the page in'),
      title: z.string().describe('The title of the new page'),
      body: z.string().describe('Page body in Confluence storage format (XHTML)'),
      parentId: z.string().optional().describe('Parent page ID for hierarchical organization'),
      status: z
        .enum(['current', 'draft'])
        .optional()
        .default('current')
        .describe('Page status')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('The newly created page ID'),
      title: z.string().describe('The page title'),
      status: z.string().describe('The page status'),
      spaceId: z.string().optional().describe('The space ID'),
      versionNumber: z.number().optional().describe('Version number (1 for new pages)'),
      webUrl: z.string().optional().describe('Web URL to view the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let page = await client.createPage({
      spaceId: ctx.input.spaceId,
      title: ctx.input.title,
      body: ctx.input.body,
      parentId: ctx.input.parentId,
      status: ctx.input.status
    });

    return {
      output: {
        pageId: page.id,
        title: page.title,
        status: page.status,
        spaceId: page.spaceId,
        versionNumber: page.version?.number,
        webUrl: page._links?.webui
      },
      message: `Created page **${page.title}** (ID: ${page.id}) in space ${page.spaceId || ctx.input.spaceId}`
    };
  })
  .build();
