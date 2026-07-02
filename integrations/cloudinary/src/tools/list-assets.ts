import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
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
  .output(
    z.object({
      resources: z
        .array(
          z.object({
            assetId: z.string().describe('Immutable unique asset identifier.'),
            publicId: z.string().describe('Public ID of the asset.'),
            format: z.string().describe('File format.'),
            resourceType: z.string().describe('Resource type.'),
            createdAt: z.string().describe('Creation timestamp.'),
            bytes: z.number().describe('File size in bytes.'),
            width: z.number().optional().describe('Width in pixels.'),
            height: z.number().optional().describe('Height in pixels.'),
            url: z.string().describe('HTTP delivery URL.'),
            secureUrl: z.string().describe('HTTPS delivery URL.'),
            folder: z.string().describe('Folder path.'),
            tags: z.array(z.string()).optional().describe('Tags on the asset.')
          })
        )
        .describe('List of assets.'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result: any;
    if (ctx.input.tag) {
      result = await client.listResourcesByTag({
        tag: ctx.input.tag,
        resourceType: ctx.input.resourceType,
        maxResults: ctx.input.maxResults,
        nextCursor: ctx.input.nextCursor
      });
    } else {
      result = await client.listResources({
        resourceType: ctx.input.resourceType,
        type: ctx.input.type,
        prefix: ctx.input.prefix,
        maxResults: ctx.input.maxResults,
        nextCursor: ctx.input.nextCursor,
        tags: ctx.input.includeTags,
        context: ctx.input.includeContext
      });
    }

    return {
      output: {
        resources: result.resources.map((r: any) => ({
          assetId: r.assetId,
          publicId: r.publicId,
          format: r.format,
          resourceType: r.resourceType,
          createdAt: r.createdAt,
          bytes: r.bytes,
          width: r.width,
          height: r.height,
          url: r.url,
          secureUrl: r.secureUrl,
          folder: r.folder,
          tags: r.tags
        })),
        nextCursor: result.nextCursor
      },
      message: `Listed **${result.resources.length}** asset(s)${ctx.input.prefix ? ` with prefix "${ctx.input.prefix}"` : ''}${ctx.input.tag ? ` tagged "${ctx.input.tag}"` : ''}.${result.nextCursor ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
