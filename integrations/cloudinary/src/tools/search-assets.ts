import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { resourceSchema } from '../lib/types';
import { spec } from '../spec';

export let searchAssets = SlateTool.create(spec, {
  name: 'Search Assets',
  key: 'search_assets',
  description: `Search for assets in Cloudinary using a Lucene-like query expression. Supports filtering by tags, metadata, format, size, dates, public ID, folder, and more. Results can be sorted and paginated.`,
  instructions: [
    'Expression examples: `resource_type:image AND tags=hero`, `format:png AND bytes>100000`, `created_at>[2024-01-01]`, `asset_folder:products/*` (dynamic mode) or `folder:products/*` (fixed mode).',
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
      totalCount: z.number(),
      time: z.number().optional(),
      nextCursor: z.string().optional(),
      resources: z.array(resourceSchema),
      aggregations: z.record(z.string(), z.unknown()).optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).search(ctx.input);
    return {
      output: result,
      message: `Found ${result.totalCount} matching asset(s); returned ${result.resources.length}.${result.nextCursor ? ' Continue with nextCursor and unchanged search parameters.' : ''}`
    };
  })
  .build();
