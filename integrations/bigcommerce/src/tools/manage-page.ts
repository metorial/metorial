import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { bigcommerceServiceError } from '../lib/errors';
import { spec } from '../spec';

export let managePage = SlateTool.create(spec, {
  name: 'Manage Page',
  key: 'manage_page',
  description: `List, create, update, or delete content pages. Pages are used for static content like About Us, Contact, Terms & Conditions, etc.`,
  instructions: [
    'Use action "list" to retrieve pages.',
    'Use action "get" to retrieve a specific page by ID.',
    'Use action "create" to create a new page.',
    'Use action "update" to modify an existing page.',
    'Use action "delete" to remove a page.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      pageId: z.number().optional().describe('Page ID (required for get/update/delete)'),
      name: z.string().optional().describe('Page name/title'),
      type: z
        .enum(['page', 'raw', 'contact_form', 'feed', 'link', 'blog'])
        .optional()
        .describe('Page type (required for create)'),
      body: z.string().optional().describe('HTML content of the page'),
      isVisible: z.boolean().optional().describe('Whether the page is visible'),
      parentId: z.number().optional().describe('Parent page ID for nesting'),
      sortOrder: z.number().optional().describe('Sort order'),
      metaTitle: z.string().optional().describe('SEO meta title'),
      metaDescription: z.string().optional().describe('SEO meta description'),
      url: z.string().optional().describe('Custom URL for the page'),
      channelId: z.number().optional().describe('Channel ID for the page'),
      page: z.number().optional().describe('Page number for list pagination'),
      limit: z.number().optional().describe('Results per page for list')
    })
  )
  .output(
    z.object({
      contentPage: z.any().optional().describe('The page object'),
      pages: z.array(z.any()).optional().describe('List of pages'),
      deleted: z.boolean().optional().describe('Whether the page was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      storeHash: ctx.config.storeHash
    });

    if (ctx.input.action === 'list') {
      let params: Record<string, any> = {};
      if (ctx.input.page) params.page = ctx.input.page;
      if (ctx.input.limit) params.limit = ctx.input.limit;
      if (ctx.input.name) params.name = ctx.input.name;
      if (ctx.input.channelId) params.channel_id = ctx.input.channelId;
      let result = await client.listPages(params);
      return {
        output: { pages: result.data },
        message: `Found ${result.data.length} pages.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.pageId) throw bigcommerceServiceError('pageId is required for get');
      let result = await client.getPage(ctx.input.pageId);
      return {
        output: { contentPage: result.data },
        message: `Retrieved page **${result.data.name}** (ID: ${result.data.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.pageId) throw bigcommerceServiceError('pageId is required for delete');
      await client.deletePage(ctx.input.pageId);
      return {
        output: { deleted: true },
        message: `Deleted page with ID ${ctx.input.pageId}.`
      };
    }

    let data: Record<string, any> = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.type) data.type = ctx.input.type;
    if (ctx.input.body) data.body = ctx.input.body;
    if (ctx.input.isVisible !== undefined) data.is_visible = ctx.input.isVisible;
    if (ctx.input.parentId !== undefined) data.parent_id = ctx.input.parentId;
    if (ctx.input.sortOrder !== undefined) data.sort_order = ctx.input.sortOrder;
    if (ctx.input.metaTitle) data.meta_title = ctx.input.metaTitle;
    if (ctx.input.metaDescription) data.meta_description = ctx.input.metaDescription;
    if (ctx.input.url) data.url = ctx.input.url;
    if (ctx.input.channelId) data.channel_id = ctx.input.channelId;

    if (ctx.input.action === 'create') {
      let result = await client.createPage(data);
      return {
        output: { contentPage: result.data },
        message: `Created page **${result.data.name}** (ID: ${result.data.id}).`
      };
    }

    if (!ctx.input.pageId) throw bigcommerceServiceError('pageId is required for update');
    let result = await client.updatePage(ctx.input.pageId, data);
    return {
      output: { contentPage: result.data },
      message: `Updated page **${result.data.name}** (ID: ${result.data.id}).`
    };
  })
  .build();
