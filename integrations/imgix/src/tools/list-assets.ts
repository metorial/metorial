import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImgixClient } from '../lib/client';
import { assetOutput, mapAsset, sourceId } from '../lib/schemas';
import { spec } from '../spec';
export const listAssets = SlateTool.create(spec, {
  name: 'List Assets',
  key: 'list_assets',
  description:
    'Browse and filter assets in a source discovered by list_sources. Returns one native cursor page and the exact opaque next cursor. Provider total counts cap at 10000; that value means 10000 or more.',
  constraints: ['Asset metadata and some features require provider plan permissions.'],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      sourceId,
      cursor: z.string().min(1).max(4096).optional(),
      limit: z.number().int().min(1).max(1000).optional().default(20),
      sort: z
        .string()
        .optional()
        .describe(
          'Comma-separated date_created, date_modified, or file_size fields, each optionally prefixed with -.'
        ),
      filterOriginPath: z.string().optional(),
      filterMediaKind: z.enum(['IMAGE', 'ANIMATION', 'DOCUMENT', 'VECTOR']).optional(),
      filterKeyword: z.string().optional(),
      filterCategories: z.string().optional(),
      filterTags: z.string().optional()
    })
  )
  .output(
    z.object({
      assets: z.array(assetOutput),
      nextCursor: z.string().optional(),
      hasMore: z.boolean(),
      totalRecords: z.number().optional(),
      totalRecordsCapped: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    const result = await new ImgixClient(ctx.auth.token).listAssets(
      ctx.input.sourceId,
      ctx.input
    );
    return {
      output: {
        assets: result.data.map(mapAsset),
        nextCursor: result.cursor.hasMore ? (result.cursor.next ?? undefined) : undefined,
        hasMore: result.cursor.hasMore,
        totalRecords: result.totalRecords,
        totalRecordsCapped:
          result.totalRecords === undefined ? undefined : result.totalRecords >= 10000
      },
      message: `Found ${result.data.length} asset(s) on this cursor page${result.cursor.hasMore ? '; another page is available' : ''}.`
    };
  })
  .build();
