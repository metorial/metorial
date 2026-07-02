import { SlateTool } from 'slates';
import { z } from 'zod';
import { ChameleonClient } from '../lib/client';
import { spec } from '../spec';

let segmentSchema = z.object({
  segmentId: z.string().describe('Chameleon segment ID'),
  name: z.string().optional().describe('Segment name'),
  items: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Segmentation filter expressions'),
  itemsOp: z.string().optional().describe('Logical operator joining filters: "and" or "or"'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp')
});

let mapSegment = (seg: Record<string, unknown>) => ({
  segmentId: seg.id as string,
  name: seg.name as string | undefined,
  items: seg.items as Record<string, unknown>[] | undefined,
  itemsOp: seg.items_op as string | undefined,
  createdAt: seg.created_at as string | undefined,
  updatedAt: seg.updated_at as string | undefined
});

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List audience segments used for targeting Chameleon experiences, or retrieve a specific segment with its filter expressions.
Optionally list experiences (tours, surveys, launchers) connected to a segment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z
        .string()
        .optional()
        .describe('Chameleon segment ID to retrieve a specific segment'),
      experienceKind: z
        .enum(['tour', 'survey', 'launcher'])
        .optional()
        .describe(
          'If set along with segmentId, retrieves experiences of this type connected to the segment'
        ),
      limit: z
        .number()
        .min(1)
        .max(500)
        .optional()
        .describe('Number of segments to return (1-500, default 50)'),
      before: z.string().optional().describe('Pagination cursor for older items'),
      after: z.string().optional().describe('Pagination cursor for newer items')
    })
  )
  .output(
    z.object({
      segment: segmentSchema.optional().describe('Single segment (when fetching by ID)'),
      segments: z.array(segmentSchema).optional().describe('Array of segments'),
      experiences: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Experiences connected to the segment'),
      cursor: z
        .object({
          limit: z.number().optional(),
          before: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ChameleonClient(ctx.auth.token);

    if (ctx.input.segmentId && ctx.input.experienceKind) {
      let result = await client.getSegmentExperiences(
        ctx.input.segmentId,
        ctx.input.experienceKind
      );
      return {
        output: {
          segment: mapSegment(result),
          experiences: result[`${ctx.input.experienceKind}s`] || [],
          cursor: result.cursor
        },
        message: `Retrieved segment with **${(result[`${ctx.input.experienceKind}s`] || []).length}** connected ${ctx.input.experienceKind}s.`
      };
    }

    if (ctx.input.segmentId) {
      let result = await client.getSegment(ctx.input.segmentId);
      return {
        output: { segment: mapSegment(result) },
        message: `Retrieved segment **${result.name || result.id}**.`
      };
    }

    let result = await client.listSegments({
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let segments = (result.segments || []).map(mapSegment);
    return {
      output: { segments, cursor: result.cursor },
      message: `Returned **${segments.length}** segments.`
    };
  })
  .build();
