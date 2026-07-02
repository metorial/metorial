import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCustomContent = SlateTool.create(spec, {
  name: 'Manage Custom Content Index',
  key: 'manage_custom_content',
  description: `Index, list, or delete external custom content in Slite's AI knowledge base so the Ask feature can reference it when answering questions. Use **action** to select the operation.`,
  instructions: [
    'Use action "index" to add or update custom content for AI search.',
    'Use action "list" to view indexed content for a given root data source.',
    'Use action "delete" to remove previously indexed content.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['index', 'list', 'delete']).describe('Operation to perform'),
      rootId: z.string().describe('Root data source identifier'),
      contentId: z
        .string()
        .optional()
        .describe('Unique object ID (required for index and delete)'),
      title: z.string().optional().describe('Content title (required for index)'),
      content: z
        .string()
        .optional()
        .describe('Content body in markdown or HTML (required for index)'),
      contentType: z
        .enum(['markdown', 'html'])
        .optional()
        .describe('Content format (required for index)'),
      contentUpdatedAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp of content last update (required for index)'),
      contentUrl: z
        .string()
        .optional()
        .describe('URL to the original content (required for index)'),
      page: z.number().optional().describe('Page number for listing (0-indexed)'),
      hitsPerPage: z.number().optional().describe('Results per page for listing (1-100)')
    })
  )
  .output(
    z.object({
      indexed: z.boolean().optional().describe('Whether content was successfully indexed'),
      deleted: z.boolean().optional().describe('Whether content was successfully deleted'),
      hits: z
        .array(
          z.object({
            contentId: z.string(),
            title: z.string(),
            url: z.string()
          })
        )
        .optional()
        .describe('Listed indexed content items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, rootId } = ctx.input;

    if (action === 'index') {
      if (
        !ctx.input.contentId ||
        !ctx.input.title ||
        !ctx.input.content ||
        !ctx.input.contentType ||
        !ctx.input.contentUpdatedAt ||
        !ctx.input.contentUrl
      ) {
        throw new Error(
          'contentId, title, content, contentType, contentUpdatedAt, and contentUrl are required for the index action'
        );
      }
      await client.indexCustomContent({
        rootId,
        contentId: ctx.input.contentId,
        title: ctx.input.title,
        content: ctx.input.content,
        type: ctx.input.contentType,
        updatedAt: ctx.input.contentUpdatedAt,
        url: ctx.input.contentUrl
      });
      return {
        output: { indexed: true },
        message: `Indexed content **${ctx.input.title}** under root \`${rootId}\``
      };
    }

    if (action === 'delete') {
      if (!ctx.input.contentId) {
        throw new Error('contentId is required for the delete action');
      }
      await client.deleteCustomContent(rootId, ctx.input.contentId);
      return {
        output: { deleted: true },
        message: `Deleted indexed content \`${ctx.input.contentId}\` from root \`${rootId}\``
      };
    }

    // list
    let result = await client.listCustomContent(rootId, ctx.input.page, ctx.input.hitsPerPage);
    let hits = (result.hits || []).map((item: any) => ({
      contentId: item.id,
      title: item.title,
      url: item.url
    }));

    return {
      output: { hits },
      message: `Listed **${hits.length}** indexed content item(s) for root \`${rootId}\``
    };
  })
  .build();
