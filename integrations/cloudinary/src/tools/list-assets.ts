import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { resourceSchema } from '../lib/types';
import { fail } from '../lib/validation';
import { spec } from '../spec';

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `List assets in your Cloudinary environment. Can filter by resource type, delivery type, prefix (folder path), or tag. Supports pagination for browsing large collections.`,
  instructions: [
    'To list assets in a specific folder, use the prefix parameter with the folder path.',
    'To list assets by tag, use the tag parameter instead of prefix.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceType: z
        .enum(['image', 'video', 'raw'])
        .default('image')
        .describe('Resource type to list.'),
      type: z
        .enum(['upload', 'fetch', 'private', 'authenticated'])
        .default('upload')
        .describe('Delivery type to list.'),
      prefix: z.string().optional().describe('Filter by public ID prefix (folder path).'),
      tag: z
        .string()
        .optional()
        .describe('Filter by tag. When specified, prefix and type are ignored.'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results (default 10, max 500).'),
      nextCursor: z.string().optional().describe('Cursor for pagination.'),
      includeTags: z.boolean().optional().describe('Include tags in the response.'),
      includeContext: z
        .boolean()
        .optional()
        .describe('Include contextual metadata in the response.')
    })
  )
  .output(z.object({ resources: z.array(resourceSchema), nextCursor: z.string().optional() }))
  .handleInvocation(async ctx => {
    if (
      ctx.input.tag !== undefined &&
      (ctx.input.prefix !== undefined || ctx.input.type !== 'upload')
    )
      fail(
        'Tag listing does not support a public-ID prefix or another delivery type. Use search_assets for combined filters.'
      );
    const client = createClient(ctx),
      params = {
        resourceType: ctx.input.resourceType,
        type: ctx.input.type,
        prefix: ctx.input.prefix,
        maxResults: ctx.input.maxResults,
        nextCursor: ctx.input.nextCursor,
        tags: ctx.input.includeTags,
        context: ctx.input.includeContext
      };
    const result =
      ctx.input.tag !== undefined
        ? await client.listResourcesByTag({ ...params, tag: ctx.input.tag })
        : await client.listResources(params);
    return {
      output: result,
      message: `Listed ${result.resources.length} asset(s).${result.nextCursor ? ' Continue with nextCursor and the same filters.' : ''}`
    };
  })
  .build();
