import { SlateTool } from 'slates';
import { z } from 'zod';
import { SimpleroClient } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description:
    'Discover Simplero segments and their IDs for selecting broadcast recipients. Supports search and pagination.',
  instructions: [
    'Pass segment IDs to manage_broadcast.segmentIds when creating a broadcast.',
    'For the next page, pass pagination.next_after as after. Cursor pagination takes precedence over page.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Page number, starting at 1; ignored when after is provided'),
      perPage: z.number().optional().describe('Results per page, from 1 to 100; default 20'),
      after: z
        .number()
        .optional()
        .describe('Cursor from the previous response pagination.next_after'),
      query: z.string().optional().describe('Search text for matching segments')
    })
  )
  .output(
    z.object({
      segments: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Segment records including IDs and names'),
      pagination: z
        .record(z.string(), z.unknown())
        .describe('Page, per_page, total, total_pages, and next_after metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SimpleroClient({
      token: ctx.auth.token,
      userAgent: ctx.config.userAgent
    });
    let result = await client.listSegments(ctx.input);
    return {
      output: { segments: result.data, pagination: result.pagination },
      message: `Found **${result.data.length}** segment(s).`
    };
  })
  .build();
