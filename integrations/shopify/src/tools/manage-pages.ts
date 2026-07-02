import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { ShopifyClient } from '../lib/client';
import { shopifyServiceError } from '../lib/errors';
import { spec } from '../spec';

let pageSchema = z.object({
  pageId: z.string(),
  title: z.string(),
  handle: z.string(),
  author: z.string().nullable(),
  bodyHtml: z.string().nullable(),
  publishedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string()
});

export let managePages = SlateTool.create(spec, {
  name: 'Manage Pages',
  key: 'manage_pages',
  description: `List, retrieve, create, update, or delete Shopify online store pages. Pages are useful for static storefront content such as About, FAQ, policy, and campaign pages.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      pageId: z.string().optional().describe('Page ID (required for get/update/delete)'),
      title: z.string().optional().describe('Page title (for create/update)'),
      bodyHtml: z.string().optional().describe('Page HTML body (for create/update)'),
      author: z.string().optional().describe('Page author (for create/update)'),
      handle: z.string().optional().describe('URL handle (for create/update)'),
      published: z
        .boolean()
        .optional()
        .describe('Whether the page should be published. False hides the page.'),
      publishedAt: z.string().optional().describe('Explicit publication timestamp (ISO 8601)'),
      limit: z.number().min(1).max(250).optional().describe('Number of pages to return'),
      sinceId: z.string().optional().describe('Show pages after this ID for pagination')
    })
  )
  .output(
    z.object({
      pages: z.array(pageSchema).optional(),
      page: pageSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShopifyClient({
      token: ctx.auth.token,
      shopDomain: ctx.config.shopDomain,
      apiVersion: ctx.config.apiVersion
    });

    let mapPage = (page: any) => ({
      pageId: String(page.id),
      title: page.title,
      handle: page.handle,
      author: page.author,
      bodyHtml: page.body_html,
      publishedAt: page.published_at,
      createdAt: page.created_at,
      updatedAt: page.updated_at
    });

    let buildPagePayload = () => {
      let data: Record<string, any> = {};
      if (ctx.input.title !== undefined) data.title = ctx.input.title;
      if (ctx.input.bodyHtml !== undefined) data.body_html = ctx.input.bodyHtml;
      if (ctx.input.author !== undefined) data.author = ctx.input.author;
      if (ctx.input.handle !== undefined) data.handle = ctx.input.handle;
      if (ctx.input.publishedAt !== undefined) {
        data.published_at = ctx.input.publishedAt;
      } else if (ctx.input.published === true) {
        data.published_at = new Date().toISOString();
      } else if (ctx.input.published === false) {
        data.published_at = null;
      }
      return data;
    };

    if (ctx.input.action === 'list') {
      let pages = await client.listPages({
        limit: ctx.input.limit,
        sinceId: ctx.input.sinceId
      });
      return {
        output: { pages: pages.map(mapPage) },
        message: `Found **${pages.length}** page(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.pageId) throw shopifyServiceError('pageId is required.');
      let page = await client.getPage(ctx.input.pageId);
      return {
        output: { page: mapPage(page) },
        message: `Retrieved page **${page.title}**.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.title) throw shopifyServiceError('title is required.');
      let page = await client.createPage(buildPagePayload());
      return {
        output: { page: mapPage(page) },
        message: `Created page **${page.title}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.pageId) throw shopifyServiceError('pageId is required.');
      let page = await client.updatePage(ctx.input.pageId, buildPagePayload());
      return {
        output: { page: mapPage(page) },
        message: `Updated page **${page.title}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.pageId) throw shopifyServiceError('pageId is required.');
      await client.deletePage(ctx.input.pageId);
      return {
        output: { deleted: true },
        message: `Deleted page **${ctx.input.pageId}**.`
      };
    }

    throw shopifyServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
