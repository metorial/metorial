import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let searchAssets = SlateTool.create(spec, {
  name: 'Search Assets',
  key: 'search_assets',
  description: `Search for assets in Cloudinary using a Lucene-like query expression. Supports filtering by tags, metadata, format, size, dates, public ID, folder, and more. Results can be sorted and paginated.`,
  instructions: [
    'Expression examples: `resource_type:image AND tags=hero`, `format:png AND bytes>100000`, `created_at>[2024-01-01]`, `folder:products/*`.',
    'Use withField to include additional fields like "tags", "context", or "metadata" in results.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      expression: z
        .string()
        .optional()
        .describe(
          'Search expression in Lucene-like query language. If omitted, returns the most recently created assets.'
        ),
      sortBy: z
        .array(
          z.object({
            field: z
              .string()
              .describe('Field to sort by (e.g., "created_at", "public_id", "bytes").'),
            direction: z.enum(['asc', 'desc']).describe('Sort direction.')
          })
        )
        .optional()
        .describe('Fields to sort results by.'),
      maxResults: z
        .number()
        .optional()
        .describe('Maximum number of results to return (up to 500, default 50).'),
      nextCursor: z.string().optional().describe('Cursor for paginating through results.'),
      withField: z
        .array(z.string())
        .optional()
        .describe(
          'Additional fields to include in results (e.g., "tags", "context", "metadata").'
        ),
      aggregate: z
        .array(z.string())
        .optional()
        .describe('Fields to get aggregate counts for (e.g., "format", "resource_type").')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching assets.'),
      time: z.number().describe('Time taken for the search in milliseconds.'),
      nextCursor: z
        .string()
        .optional()
        .describe('Cursor for fetching the next page of results.'),
      resources: z
        .array(
          z.object({
            assetId: z.string().describe('Immutable unique asset identifier.'),
            publicId: z.string().describe('Public ID of the asset.'),
            format: z.string().describe('File format.'),
            resourceType: z.string().describe('Resource type (image, video, raw).'),
            createdAt: z.string().describe('Creation timestamp.'),
            bytes: z.number().describe('File size in bytes.'),
            width: z.number().optional().describe('Width in pixels.'),
            height: z.number().optional().describe('Height in pixels.'),
            url: z.string().describe('HTTP delivery URL.'),
            secureUrl: z.string().describe('HTTPS delivery URL.'),
            folder: z.string().describe('Folder path.'),
            tags: z.array(z.string()).optional().describe('Tags assigned to the asset.')
          })
        )
        .describe('List of matching assets.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.search({
      expression: ctx.input.expression,
      sortBy: ctx.input.sortBy,
      maxResults: ctx.input.maxResults,
      nextCursor: ctx.input.nextCursor,
      withField: ctx.input.withField,
      aggregate: ctx.input.aggregate
    });

    return {
      output: {
        totalCount: result.totalCount,
        time: result.time,
        nextCursor: result.nextCursor,
        resources: result.resources.map(r => ({
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
        }))
      },
      message: `Found **${result.totalCount}** assets${ctx.input.expression ? ` matching \`${ctx.input.expression}\`` : ''}. Returned ${result.resources.length} results.${result.nextCursor ? ' More results available via pagination.' : ''}`
    };
  })
  .build();
