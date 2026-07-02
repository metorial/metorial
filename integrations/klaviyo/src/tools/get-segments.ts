import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, extractPaginationCursor } from '../lib/helpers';
import { spec } from '../spec';

export let getSegments = SlateTool.create(spec, {
  name: 'Get Segments',
  key: 'get_segments',
  description: `Retrieve segments from Klaviyo. Segments are dynamic groups of profiles based on conditions such as behavior, engagement, location, or predictive analytics.
Can fetch a single segment by ID or list all segments with optional filtering.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z
        .string()
        .optional()
        .describe('Specific segment ID to retrieve. Omit to list all segments.'),
      filter: z.string().optional().describe('Filter string for listing segments'),
      pageCursor: z.string().optional().describe('Pagination cursor'),
      pageSize: z.number().optional().describe('Results per page (max 100)')
    })
  )
  .output(
    z.object({
      segments: z
        .array(
          z.object({
            segmentId: z.string().describe('Segment ID'),
            name: z.string().optional().describe('Segment name'),
            definition: z.any().optional().describe('Segment definition conditions'),
            created: z.string().optional().describe('Creation timestamp'),
            updated: z.string().optional().describe('Last updated timestamp'),
            isActive: z.boolean().optional().describe('Whether the segment is active'),
            isStarred: z.boolean().optional().describe('Whether the segment is starred')
          })
        )
        .describe('List of segments'),
      nextCursor: z.string().optional().describe('Cursor for next page'),
      hasMore: z.boolean().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.segmentId) {
      let result = await client.getSegment(ctx.input.segmentId);
      let s = Array.isArray(result.data) ? result.data[0] : result.data;
      return {
        output: {
          segments: [
            {
              segmentId: s?.id ?? '',
              name: s?.attributes?.name,
              definition: s?.attributes?.definition,
              created: s?.attributes?.created,
              updated: s?.attributes?.updated,
              isActive: s?.attributes?.is_active,
              isStarred: s?.attributes?.is_starred
            }
          ],
          hasMore: false
        },
        message: `Retrieved segment **${s?.attributes?.name ?? ctx.input.segmentId}**`
      };
    }

    let result = await client.getSegments({
      filter: ctx.input.filter,
      pageCursor: ctx.input.pageCursor,
      pageSize: ctx.input.pageSize
    });

    let segments = result.data.map(s => ({
      segmentId: s.id ?? '',
      name: s.attributes?.name ?? undefined,
      definition: s.attributes?.definition ?? undefined,
      created: s.attributes?.created ?? undefined,
      updated: s.attributes?.updated ?? undefined,
      isActive: s.attributes?.is_active ?? undefined,
      isStarred: s.attributes?.is_starred ?? undefined
    }));

    let nextCursor = extractPaginationCursor(result.links);

    return {
      output: { segments, nextCursor, hasMore: !!nextCursor },
      message: `Retrieved **${segments.length}** segments`
    };
  })
  .build();
