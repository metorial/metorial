import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let updatePage = SlateTool.create(spec, {
  name: 'Update Page',
  key: 'update_page',
  description: `Update an existing Confluence page's title, body, or status. Requires the current version number to prevent conflicts. If you don't know the current version, use **Get Page** first to retrieve it.`,
  instructions: [
    'You must provide the current version number. The update will increment it automatically.',
    'To update just the title without changing body, omit the body field.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      pageId: z.string().describe('The page ID to update'),
      title: z.string().optional().describe('New page title'),
      body: z
        .string()
        .optional()
        .describe('New page body in Confluence storage format (XHTML)'),
      versionNumber: z.coerce
        .number()
        .describe('The current version number of the page (will be incremented)'),
      versionMessage: z
        .string()
        .optional()
        .describe('A message describing the changes in this version'),
      status: z.enum(['current', 'draft']).optional().describe('New page status')
    })
  )
  .output(
    z.object({
      pageId: z.string().describe('The updated page ID'),
      title: z.string().describe('The updated page title'),
      status: z.string().describe('The page status'),
      versionNumber: z.number().optional().describe('The new version number'),
      webUrl: z.string().optional().describe('Web URL to view the page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let page = await client.updatePage(ctx.input.pageId, {
      title: ctx.input.title,
      body: ctx.input.body,
      version: ctx.input.versionNumber + 1,
      status: ctx.input.status,
      message: ctx.input.versionMessage
    });

    return {
      output: {
        pageId: page.id,
        title: page.title,
        status: page.status,
        versionNumber: page.version?.number,
        webUrl: page._links?.webui
      },
      message: `Updated page **${page.title}** to version ${page.version?.number || 'unknown'}`
    };
  })
  .build();
