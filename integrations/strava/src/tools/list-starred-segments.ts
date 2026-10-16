import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listStarredSegments = SlateTool.create(spec, {
  name: 'List Starred Segments',
  key: 'list_starred_segments',
  description:
    'Discover the authenticated athlete’s starred segments. Private segments are included only with read_all scope.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Page number; Strava defaults to 1'),
      perPage: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Segments per page; Strava defaults to 30')
    })
  )
  .output(
    z.object({
      segments: z
        .array(z.any())
        .describe('Complete segment summaries with IDs, names, locations, and metrics'),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let segments = await new Client(ctx.auth).getStarredSegments(ctx.input);
    return {
      output: { segments, count: segments.length },
      message: `Retrieved ${segments.length} starred segments.`
    };
  })
  .build();
