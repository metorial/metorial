import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { invalid } from '../lib/schemas';
import { spec } from '../spec';

export let manageCustomContent = SlateTool.create(spec, {
  name: 'Manage Custom Content Index',
  key: 'manage_custom_content',
  description: `Index, list, or delete external custom content in Slite's AI knowledge base through provider-deprecated endpoints, where enabled, so the Ask feature can reference it when answering questions. Use **action** to select the operation.`,
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
      rootId: z
        .string()
        .describe(
          'Existing custom data source root created in the provider application; this integration cannot create it'
        ),
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
      page: z
        .number()
        .int()
        .nonnegative()
        .max(Number.MAX_SAFE_INTEGER)
        .optional()
        .describe('Page number for listing (0-indexed)'),
      hitsPerPage: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe('Results per page for listing (1-100)')
    })
  )
  .output(
    z.object({
      page: z.number().optional(),
      totalPages: z.number().optional(),
      hasMore: z.boolean().optional(),
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

    let indexFields = [
      'title',
      'content',
      'contentType',
      'contentUpdatedAt',
      'contentUrl'
    ] as const;
    if (
      (action !== 'index' && indexFields.some(key => ctx.input[key] !== undefined)) ||
      (action !== 'list' &&
        (ctx.input.page !== undefined || ctx.input.hitsPerPage !== undefined)) ||
      (action === 'list' && ctx.input.contentId !== undefined)
    )
      throw invalid('Provide only fields for the selected custom-content action.');
    if (action === 'index') {
      if (
        ctx.input.contentId === undefined ||
        ctx.input.title === undefined ||
        ctx.input.content === undefined ||
        ctx.input.contentType === undefined ||
        ctx.input.contentUpdatedAt === undefined ||
        ctx.input.contentUrl === undefined
      ) {
        throw invalid(
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
        throw invalid('contentId is required for the delete action');
      }
      await client.deleteCustomContent(rootId, ctx.input.contentId);
      return {
        output: { deleted: true },
        message: `Deleted indexed content \`${ctx.input.contentId}\` from root \`${rootId}\``
      };
    }

    // list
    let result = await client.listCustomContent(rootId, ctx.input.page, ctx.input.hitsPerPage);
    let hits = result.hits.map(item => ({
      contentId: item.id,
      title: item.title,
      url: item.url
    }));

    return {
      output: {
        hits,
        page: result.page,
        totalPages: result.nbPages,
        hasMore: result.page + 1 < result.nbPages
      },
      message: `Listed **${hits.length}** indexed content item(s) for root \`${rootId}\``
    };
  })
  .build();
