import { SlateTool } from 'slates';
import { z } from 'zod';
import { MagentoClient } from '../lib/client';
import { spec } from '../spec';

let pageOutputSchema = z.object({
  pageId: z.number().optional().describe('CMS page ID'),
  identifier: z.string().optional().describe('URL key/identifier'),
  title: z.string().optional().describe('Page title'),
  content: z.string().optional().describe('Page HTML content'),
  contentHeading: z.string().optional().describe('Content heading'),
  pageLayout: z.string().optional().describe('Page layout (e.g. 1column, 2columns-left)'),
  metaTitle: z.string().optional().describe('Meta title for SEO'),
  metaKeywords: z.string().optional().describe('Meta keywords for SEO'),
  metaDescription: z.string().optional().describe('Meta description for SEO'),
  isActive: z.boolean().optional().describe('Whether the page is active'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let blockOutputSchema = z.object({
  blockId: z.number().optional().describe('CMS block ID'),
  identifier: z.string().optional().describe('Block identifier'),
  title: z.string().optional().describe('Block title'),
  content: z.string().optional().describe('Block HTML content'),
  isActive: z.boolean().optional().describe('Whether the block is active'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

export let manageCms = SlateTool.create(spec, {
  name: 'Manage CMS Content',
  key: 'manage_cms',
  description: `Create, update, retrieve, list, or delete CMS pages and blocks. Manage static content pages with SEO metadata and reusable content blocks used throughout the storefront.`,
  instructions: [
    'Set **resourceType** to "page" or "block" to specify which CMS resource to manage.',
    'To **get** a resource, provide the resourceId.',
    'To **list** resources, set action to "list" with optional pageSize and currentPage.',
    'To **create**, provide identifier, title, and content at minimum.',
    'To **update**, provide resourceId and the fields to change.',
    'To **delete**, provide resourceId.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      resourceType: z.enum(['page', 'block']).describe('CMS resource type'),
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      resourceId: z.number().optional().describe('CMS page or block ID'),
      identifier: z.string().optional().describe('URL key / block identifier'),
      title: z.string().optional().describe('Title'),
      content: z.string().optional().describe('HTML content'),
      contentHeading: z.string().optional().describe('Content heading (pages only)'),
      pageLayout: z
        .string()
        .optional()
        .describe(
          'Page layout: 1column, 2columns-left, 2columns-right, 3columns (pages only)'
        ),
      metaTitle: z.string().optional().describe('Meta title for SEO (pages only)'),
      metaKeywords: z.string().optional().describe('Meta keywords (pages only)'),
      metaDescription: z.string().optional().describe('Meta description (pages only)'),
      isActive: z.boolean().optional().describe('Whether the resource is active'),
      pageSize: z.number().optional().describe('Results per page for list action'),
      currentPage: z.number().optional().describe('Page number for list action')
    })
  )
  .output(
    z.object({
      page: pageOutputSchema.optional().describe('CMS page details'),
      block: blockOutputSchema.optional().describe('CMS block details'),
      pages: z.array(pageOutputSchema).optional().describe('List of CMS pages'),
      blocks: z.array(blockOutputSchema).optional().describe('List of CMS blocks'),
      totalCount: z.number().optional().describe('Total count for list results'),
      deleted: z.boolean().optional().describe('Whether the resource was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MagentoClient({
      storeUrl: ctx.config.storeUrl,
      storeCode: ctx.config.storeCode,
      token: ctx.auth.token
    });

    let mapPage = (p: any) => ({
      pageId: p.id,
      identifier: p.identifier,
      title: p.title,
      content: p.content,
      contentHeading: p.content_heading,
      pageLayout: p.page_layout,
      metaTitle: p.meta_title,
      metaKeywords: p.meta_keywords,
      metaDescription: p.meta_description,
      isActive: p.active,
      createdAt: p.creation_time,
      updatedAt: p.update_time
    });

    let mapBlock = (b: any) => ({
      blockId: b.id,
      identifier: b.identifier,
      title: b.title,
      content: b.content,
      isActive: b.active,
      createdAt: b.creation_time,
      updatedAt: b.update_time
    });

    if (ctx.input.resourceType === 'page') {
      if (ctx.input.action === 'get') {
        if (!ctx.input.resourceId) throw new Error('resourceId is required for get action');
        let page = await client.getCmsPage(ctx.input.resourceId);
        return {
          output: { page: mapPage(page) },
          message: `Retrieved CMS page **${page.title}**.`
        };
      }

      if (ctx.input.action === 'list') {
        let result = await client.searchCmsPages({
          pageSize: ctx.input.pageSize || 20,
          currentPage: ctx.input.currentPage
        });
        return {
          output: {
            pages: result.items.map(mapPage),
            totalCount: result.total_count
          },
          message: `Listed **${result.total_count}** CMS pages (showing ${result.items.length}).`
        };
      }

      if (ctx.input.action === 'delete') {
        if (!ctx.input.resourceId) throw new Error('resourceId is required for delete action');
        await client.deleteCmsPage(ctx.input.resourceId);
        return {
          output: { deleted: true },
          message: `Deleted CMS page \`${ctx.input.resourceId}\`.`
        };
      }

      let pageData: Record<string, any> = {};
      if (ctx.input.identifier !== undefined) pageData.identifier = ctx.input.identifier;
      if (ctx.input.title !== undefined) pageData.title = ctx.input.title;
      if (ctx.input.content !== undefined) pageData.content = ctx.input.content;
      if (ctx.input.contentHeading !== undefined)
        pageData.content_heading = ctx.input.contentHeading;
      if (ctx.input.pageLayout !== undefined) pageData.page_layout = ctx.input.pageLayout;
      if (ctx.input.metaTitle !== undefined) pageData.meta_title = ctx.input.metaTitle;
      if (ctx.input.metaKeywords !== undefined)
        pageData.meta_keywords = ctx.input.metaKeywords;
      if (ctx.input.metaDescription !== undefined)
        pageData.meta_description = ctx.input.metaDescription;
      if (ctx.input.isActive !== undefined) pageData.active = ctx.input.isActive;

      if (ctx.input.action === 'create') {
        let page = await client.createCmsPage(pageData);
        return {
          output: { page: mapPage(page) },
          message: `Created CMS page **${page.title}** (ID: ${page.id}).`
        };
      }

      // update
      if (!ctx.input.resourceId) throw new Error('resourceId is required for update action');
      let page = await client.updateCmsPage(ctx.input.resourceId, pageData);
      return {
        output: { page: mapPage(page) },
        message: `Updated CMS page **${page.title}**.`
      };
    }

    // block
    if (ctx.input.action === 'get') {
      if (!ctx.input.resourceId) throw new Error('resourceId is required for get action');
      let block = await client.getCmsBlock(ctx.input.resourceId);
      return {
        output: { block: mapBlock(block) },
        message: `Retrieved CMS block **${block.title}**.`
      };
    }

    if (ctx.input.action === 'list') {
      let result = await client.searchCmsBlocks({
        pageSize: ctx.input.pageSize || 20,
        currentPage: ctx.input.currentPage
      });
      return {
        output: {
          blocks: result.items.map(mapBlock),
          totalCount: result.total_count
        },
        message: `Listed **${result.total_count}** CMS blocks (showing ${result.items.length}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.resourceId) throw new Error('resourceId is required for delete action');
      await client.deleteCmsBlock(ctx.input.resourceId);
      return {
        output: { deleted: true },
        message: `Deleted CMS block \`${ctx.input.resourceId}\`.`
      };
    }

    let blockData: Record<string, any> = {};
    if (ctx.input.identifier !== undefined) blockData.identifier = ctx.input.identifier;
    if (ctx.input.title !== undefined) blockData.title = ctx.input.title;
    if (ctx.input.content !== undefined) blockData.content = ctx.input.content;
    if (ctx.input.isActive !== undefined) blockData.active = ctx.input.isActive;

    if (ctx.input.action === 'create') {
      let block = await client.createCmsBlock(blockData);
      return {
        output: { block: mapBlock(block) },
        message: `Created CMS block **${block.title}** (ID: ${block.id}).`
      };
    }

    // update
    if (!ctx.input.resourceId) throw new Error('resourceId is required for update action');
    let block = await client.updateCmsBlock(ctx.input.resourceId, blockData);
    return {
      output: { block: mapBlock(block) },
      message: `Updated CMS block **${block.title}**.`
    };
  })
  .build();
