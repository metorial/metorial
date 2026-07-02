import { SlateTool } from 'slates';
import { z } from 'zod';
import { CmsClient } from '../lib/cms-client';
import { spec } from '../spec';

export let manageCmsContent = SlateTool.create(spec, {
  name: 'Manage CMS Content',
  key: 'manage_cms_content',
  description: `Create, update, retrieve, delete, publish, or list content items in Optimizely CMS (SaaS).
Content items are managed as structured data with typed properties. Use this to manage the full content lifecycle including publishing.`,
  instructions: [
    'Provide a contentType when creating new content.',
    'Use the "publish" action to make content publicly available.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'get',
          'delete',
          'list',
          'publish',
          'list_types',
          'get_type'
        ])
        .describe('Action to perform'),
      contentKey: z
        .string()
        .optional()
        .describe('Content key/ID (required for get, update, delete, publish)'),
      contentTypeKey: z
        .string()
        .optional()
        .describe('Content type key (for create, get_type, or filtering list)'),
      parentKey: z
        .string()
        .optional()
        .describe('Parent content key (for create or filtering list)'),
      name: z.string().optional().describe('Content name (for create/update)'),
      locale: z.string().optional().describe('Locale code (for create/get)'),
      version: z.string().optional().describe('Content version (for get)'),
      status: z.string().optional().describe('Content status (for create/update)'),
      properties: z
        .record(z.string(), z.any())
        .optional()
        .describe('Content properties (for create/update)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Items per page (for list)')
    })
  )
  .output(
    z.object({
      content: z.any().optional().describe('Content item data'),
      contentItems: z.array(z.any()).optional().describe('List of content items'),
      contentType: z.any().optional().describe('Content type data'),
      contentTypes: z.array(z.any()).optional().describe('List of content types')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CmsClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listContent({
          page: ctx.input.page,
          pageSize: ctx.input.pageSize,
          contentType: ctx.input.contentTypeKey,
          parentKey: ctx.input.parentKey
        });
        let contentItems = result.items || result.data || result;
        return {
          output: { contentItems: Array.isArray(contentItems) ? contentItems : [] },
          message: `Listed CMS content items.`
        };
      }
      case 'get': {
        if (!ctx.input.contentKey) throw new Error('contentKey is required');
        let content = await client.getContent(ctx.input.contentKey, {
          locale: ctx.input.locale,
          version: ctx.input.version
        });
        return {
          output: { content },
          message: `Retrieved CMS content **${content.name || ctx.input.contentKey}**.`
        };
      }
      case 'create': {
        if (!ctx.input.name) throw new Error('name is required');
        if (!ctx.input.contentTypeKey) throw new Error('contentTypeKey is required');
        let content = await client.createContent({
          name: ctx.input.name,
          contentType: ctx.input.contentTypeKey,
          parentKey: ctx.input.parentKey,
          locale: ctx.input.locale,
          properties: ctx.input.properties,
          status: ctx.input.status
        });
        return {
          output: { content },
          message: `Created CMS content **${content.name}**.`
        };
      }
      case 'update': {
        if (!ctx.input.contentKey) throw new Error('contentKey is required');
        let content = await client.updateContent(ctx.input.contentKey, {
          name: ctx.input.name,
          properties: ctx.input.properties,
          status: ctx.input.status
        });
        return {
          output: { content },
          message: `Updated CMS content **${content.name || ctx.input.contentKey}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.contentKey) throw new Error('contentKey is required');
        await client.deleteContent(ctx.input.contentKey);
        return {
          output: {},
          message: `Deleted CMS content ${ctx.input.contentKey}.`
        };
      }
      case 'publish': {
        if (!ctx.input.contentKey) throw new Error('contentKey is required');
        let content = await client.publishContent(ctx.input.contentKey);
        return {
          output: { content },
          message: `Published CMS content **${ctx.input.contentKey}**.`
        };
      }
      case 'list_types': {
        let result = await client.listContentTypes({
          page: ctx.input.page,
          pageSize: ctx.input.pageSize
        });
        let contentTypes = result.items || result.data || result;
        return {
          output: { contentTypes: Array.isArray(contentTypes) ? contentTypes : [] },
          message: `Listed CMS content types.`
        };
      }
      case 'get_type': {
        if (!ctx.input.contentTypeKey) throw new Error('contentTypeKey is required');
        let contentType = await client.getContentType(ctx.input.contentTypeKey);
        return {
          output: { contentType },
          message: `Retrieved CMS content type **${contentType.name || ctx.input.contentTypeKey}**.`
        };
      }
    }
  })
  .build();
