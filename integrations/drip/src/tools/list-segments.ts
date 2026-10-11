import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type DripRecord } from '../lib/client';
import { accountIdSchema, paging, pagingShape } from '../lib/schemas';
import { spec } from '../spec';

const mapSegment = (s: DripRecord) => ({
  segmentId: s.id,
  name: s.name,
  summary: typeof s.derived?.summary === 'string' ? (s.derived.summary as string) : undefined,
  createdAt: s.created_at,
  updatedAt: s.updated_at
});

export const listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description:
    'List saved subscriber segments, optionally filtered by name, or fetch one segment with a plain-English summary of its rules. Segment IDs are used to target broadcasts with manage_broadcast.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      segmentId: z
        .string()
        .optional()
        .describe('Fetch this segment (with its rule summary) instead of listing.'),
      query: z
        .string()
        .optional()
        .describe('Case-insensitive substring match on the segment name.'),
      page: z.number().optional().describe('Page number, starting at 1.'),
      perPage: z.number().optional().describe('Results per page (max 100).')
    })
  )
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentId: z.string(),
          name: z.string().optional(),
          summary: z
            .string()
            .optional()
            .describe('Plain-English rule summary; returned only when fetching one segment.'),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional()
        })
      ),
      ...pagingShape
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client({
      token: ctx.auth.token,
      accountId: ctx.input.accountId ?? ctx.config.accountId,
      tokenType: ctx.auth.tokenType
    });

    if (ctx.input.segmentId) {
      const result = await client.fetchSegment(ctx.input.segmentId);
      return {
        output: { segments: result.segments.map(mapSegment) },
        message: `Fetched segment **${result.segments[0].name ?? ctx.input.segmentId}**.`
      };
    }

    const result = await client.listSegments({
      query: ctx.input.query,
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    const segments = result.segments.map(mapSegment);
    return {
      output: { segments, ...paging(result) },
      message: `Found **${segments.length}** segments.`
    };
  })
  .build();
