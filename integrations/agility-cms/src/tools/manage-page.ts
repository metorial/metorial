import { SlateTool } from 'slates';
import { z } from 'zod';
import { MgmtClient } from '../lib/client';
import { spec } from '../spec';

export let managePage = SlateTool.create(spec, {
  name: 'Manage Page',
  key: 'manage_page',
  description: `Creates, updates, deletes, publishes, or unpublishes a page via the Management API. Combines all page lifecycle operations into one tool. Requires OAuth authentication.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      operation: z
        .enum(['save', 'delete', 'publish', 'unpublish'])
        .describe('Operation to perform on the page'),
      pageId: z
        .number()
        .optional()
        .describe(
          'Page ID. Required for update, delete, publish, unpublish. Omit for create.'
        ),
      name: z.string().optional().describe('Page name (for save operations)'),
      title: z.string().optional().describe('Page title (for save operations)'),
      templateId: z.number().optional().describe('Page template ID (for save operations)'),
      parentPageId: z
        .number()
        .optional()
        .describe('Parent page ID for positioning in the tree (for save operations)'),
      pageData: z
        .record(z.string(), z.any())
        .optional()
        .describe('Additional page data fields to set'),
      locale: z.string().optional().describe('Locale code override')
    })
  )
  .output(
    z.object({
      pageId: z.number().optional().describe('Page ID of the affected page'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MgmtClient({
      token: ctx.auth.token,
      guid: ctx.config.guid,
      locale: ctx.input.locale || ctx.config.locale,
      region: ctx.auth.region
    });

    switch (ctx.input.operation) {
      case 'delete': {
        if (!ctx.input.pageId) throw new Error('pageId is required for delete');
        await client.deletePage(ctx.input.pageId);
        return {
          output: { pageId: ctx.input.pageId, success: true },
          message: `Deleted page **#${ctx.input.pageId}**`
        };
      }
      case 'publish': {
        if (!ctx.input.pageId) throw new Error('pageId is required for publish');
        await client.publishPage(ctx.input.pageId);
        return {
          output: { pageId: ctx.input.pageId, success: true },
          message: `Published page **#${ctx.input.pageId}**`
        };
      }
      case 'unpublish': {
        if (!ctx.input.pageId) throw new Error('pageId is required for unpublish');
        await client.unpublishPage(ctx.input.pageId);
        return {
          output: { pageId: ctx.input.pageId, success: true },
          message: `Unpublished page **#${ctx.input.pageId}**`
        };
      }
      case 'save': {
        let page: Record<string, any> = { ...(ctx.input.pageData || {}) };
        if (ctx.input.pageId) page.pageID = ctx.input.pageId;
        if (ctx.input.name) page.name = ctx.input.name;
        if (ctx.input.title) page.title = ctx.input.title;
        if (ctx.input.templateId) page.templateID = ctx.input.templateId;
        if (ctx.input.parentPageId) page.parentPageID = ctx.input.parentPageId;

        let result = await client.savePage(page);
        let savedId = result?.pageID ?? ctx.input.pageId;

        return {
          output: { pageId: savedId, success: true },
          message: ctx.input.pageId
            ? `Updated page **#${savedId}**`
            : `Created page **#${savedId}** — "${ctx.input.name || ctx.input.title || 'Untitled'}"`
        };
      }
    }
  })
  .build();
