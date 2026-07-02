import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { spec } from '../spec';

let assetSchema = z.object({
  originPath: z.string().describe('Origin path of the asset in the storage backend'),
  name: z.string().optional().describe('Display name of the asset'),
  description: z.string().optional().describe('Asset description'),
  mediaKind: z.string().optional().describe('Media type (IMAGE, ANIMATION, DOCUMENT, VECTOR)'),
  mediaHeight: z.number().optional().describe('Image height in pixels'),
  mediaWidth: z.number().optional().describe('Image width in pixels'),
  fileSize: z.number().optional().describe('File size in bytes'),
  categories: z.array(z.string()).optional().describe('Asset categories'),
  tags: z.array(z.string()).optional().describe('Asset tags'),
  colors: z.record(z.string(), z.any()).optional().describe('Detected colors in the asset'),
  customFields: z.record(z.string(), z.string()).optional().describe('Custom metadata fields')
});

export let listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description: `Browse and search assets within an Imgix source. Supports filtering by keyword, path, media type, categories, and tags. Returns asset metadata including dimensions, file size, and custom fields. Use cursor-based pagination for large result sets.`,
  constraints: [
    'Maximum 1,001 total records returned per listing.',
    'Some asset detail features are restricted to Enterprise/Premium plans.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sourceId: z.string().describe('ID of the source to list assets from'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z
        .number()
        .optional()
        .describe('Number of assets per page (default varies by plan)'),
      sort: z.string().optional().describe('Sort field. Use - prefix for descending.'),
      filterOriginPath: z.string().optional().describe('Filter by origin path prefix'),
      filterMediaKind: z
        .enum(['IMAGE', 'ANIMATION', 'DOCUMENT', 'VECTOR'])
        .optional()
        .describe('Filter by media type'),
      filterKeyword: z.string().optional().describe('Search keyword to filter assets'),
      filterCategories: z
        .string()
        .optional()
        .describe('Comma-separated categories to filter by (AND logic)'),
      filterTags: z
        .string()
        .optional()
        .describe('Comma-separated tags to filter by (AND logic)')
    })
  )
  .output(
    z.object({
      assets: z.array(assetSchema).describe('List of assets'),
      nextCursor: z.string().optional().describe('Cursor for the next page of results'),
      hasMore: z.boolean().describe('Whether more results are available'),
      totalRecords: z.number().optional().describe('Total number of matching records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImgixClient(ctx.auth.token);

    let result = await client.listAssets(ctx.input.sourceId, {
      cursor: ctx.input.cursor,
      limit: ctx.input.limit,
      sort: ctx.input.sort,
      filterOriginPath: ctx.input.filterOriginPath,
      filterMediaKind: ctx.input.filterMediaKind,
      filterKeyword: ctx.input.filterKeyword,
      filterCategories: ctx.input.filterCategories,
      filterTags: ctx.input.filterTags
    });

    let assets = (result.data || []).map((a: any) => ({
      originPath: a.attributes?.origin_path ?? a.id ?? '',
      name: a.attributes?.name,
      description: a.attributes?.description,
      mediaKind: a.attributes?.media_kind,
      mediaHeight: a.attributes?.media_height,
      mediaWidth: a.attributes?.media_width,
      fileSize: a.attributes?.file_size,
      categories: a.attributes?.categories,
      tags: a.attributes?.tags,
      colors: a.attributes?.colors,
      customFields: a.attributes?.custom_fields
    }));

    let cursor = result.meta?.cursor;

    return {
      output: {
        assets,
        nextCursor: cursor?.next,
        hasMore: cursor?.hasMore ?? false,
        totalRecords: cursor?.totalRecords
      },
      message: `Found **${assets.length}** asset(s)${cursor?.hasMore ? ' (more available)' : ''}.`
    };
  })
  .build();
