import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { PagesClient } from '../lib/client';
import { spec } from '../spec';

export let managePages = SlateTool.create(spec, {
  name: 'Manage HTML Pages',
  key: 'manage_pages',
  description: `Deploy, update, list, retrieve, or delete hosted HTML pages on CustomJS. Pages are deployed instantly with no build steps required. Use this for landing pages, AI-generated pages, campaign pages, and prototypes. Supports custom slugs for friendly URLs.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create_or_update', 'list', 'get', 'delete', 'update'])
        .describe('The page management action to perform.'),
      name: z
        .string()
        .optional()
        .describe(
          'Unique name/identifier for the page. Used for upsert matching. Required for create_or_update. Optional for update.'
        ),
      htmlContent: z
        .string()
        .optional()
        .describe('Full HTML content of the page. Required for create_or_update and update.'),
      slug: z
        .string()
        .optional()
        .describe(
          'Custom URL slug (lowercase letters, numbers, hyphens, 3-100 chars). Optional for create_or_update.'
        ),
      pageId: z
        .string()
        .optional()
        .describe(
          'Page ID. Call manage_pages with action list to discover IDs. Required for get, update, and delete.'
        )
    })
  )
  .output(
    z.object({
      pageId: z.string().optional().describe('ID of the created/updated page.'),
      pageUrl: z.string().optional().describe('Public URL of the hosted page.'),
      pageName: z.string().optional().describe('Name of the page.'),
      created: z
        .boolean()
        .optional()
        .describe('Whether the page was newly created (true) or updated (false).'),
      pages: z
        .array(z.any())
        .optional()
        .describe('List of pages. Returned for the list action.'),
      page: z.any().optional().describe('Page details. Returned for the get action.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagesClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create_or_update': {
        if (!ctx.input.name)
          throw createApiServiceError('name is required for create_or_update.');
        if (!ctx.input.htmlContent)
          throw createApiServiceError('htmlContent is required for create_or_update.');

        let result = await client.upsertPage({
          name: ctx.input.name,
          htmlContent: ctx.input.htmlContent,
          slug: ctx.input.slug
        });

        return {
          output: {
            pageId: result.pageId,
            pageUrl: result.htmlFileUrl,
            pageName: result.name,
            created: result.created
          },
          message: result.created
            ? `Page "${result.name}" created successfully at ${result.htmlFileUrl}.`
            : `Page "${result.name}" updated successfully at ${result.htmlFileUrl}.`
        };
      }

      case 'update': {
        if (!ctx.input.pageId)
          throw createApiServiceError(
            'pageId is required for update. Call manage_pages with action list to find it.'
          );
        if (!ctx.input.htmlContent)
          throw createApiServiceError('htmlContent is required for update.');
        let page = await client.updatePage(ctx.input.pageId, {
          htmlContent: ctx.input.htmlContent,
          name: ctx.input.name
        });
        return {
          output: {
            pageId: page.pageId,
            pageUrl: page.htmlFileUrl,
            pageName: page.name,
            created: false,
            page
          },
          message: 'Hosted page updated successfully.'
        };
      }

      case 'list': {
        let pages = await client.listPages();
        return {
          output: { pages },
          message: `Retrieved ${pages.length} hosted pages.`
        };
      }

      case 'get': {
        if (!ctx.input.pageId) throw createApiServiceError('pageId is required for get.');
        let page = await client.getPage(ctx.input.pageId);
        return {
          output: { page },
          message: `Retrieved page details.`
        };
      }

      case 'delete': {
        if (!ctx.input.pageId) throw createApiServiceError('pageId is required for delete.');
        await client.deletePage(ctx.input.pageId);
        return {
          output: {},
          message: `Page deleted successfully.`
        };
      }

      default:
        throw createApiServiceError(`Unknown action: ${ctx.input.action}`);
    }
  })
  .build();
