import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List all subscriber segments. Segments are saved filters for grouping subscribers based on various criteria configured in the Kit dashboard.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      perPage: z.number().optional().describe('Results per page (max 1000)'),
      cursor: z.string().optional().describe('Pagination cursor for next page')
    })
  )
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentId: z.number().describe('Segment ID'),
          segmentName: z.string().describe('Segment name'),
          createdAt: z.string().describe('Creation timestamp')
        })
      ),
      hasNextPage: z.boolean(),
      nextCursor: z.string().nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let result = await client.listSegments({
      perPage: ctx.input.perPage,
      after: ctx.input.cursor
    });

    let segments = result.segments.map(s => ({
      segmentId: s.id,
      segmentName: s.name,
      createdAt: s.created_at
    }));

    return {
      output: {
        segments,
        hasNextPage: result.pagination.has_next_page,
        nextCursor: result.pagination.end_cursor
      },
      message: `Found **${segments.length}** segment(s)${result.pagination.has_next_page ? ' (more available)' : ''}.`
    };
  });
