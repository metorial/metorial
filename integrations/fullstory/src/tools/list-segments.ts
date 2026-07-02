import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSegments = SlateTool.create(spec, {
  name: 'List Segments',
  key: 'list_segments',
  description: `List saved user segments in FullStory. Segments are saved groups of users defined by user and event filters. Optionally filter by the segment creator's email.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of segments to return (default 20, max 100)'),
      paginationToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results'),
      creator: z.string().optional().describe('Filter segments by creator email')
    })
  )
  .output(
    z.object({
      segments: z.array(
        z.object({
          segmentId: z.string().describe('Segment ID'),
          name: z.string().describe('Segment name'),
          creator: z.string().optional().describe('Email of the segment creator'),
          created: z.string().optional().describe('When the segment was created (ISO 8601)'),
          url: z.string().optional().describe('URL to view this segment in FullStory')
        })
      ),
      nextPaginationToken: z
        .string()
        .optional()
        .describe('Token for the next page, absent if no more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSegments({
      limit: ctx.input.limit,
      paginationToken: ctx.input.paginationToken,
      creator: ctx.input.creator
    });

    return {
      output: {
        segments: result.segments,
        nextPaginationToken: result.nextPaginationToken
      },
      message: `Found **${result.segments.length}** segments.${result.nextPaginationToken ? ' More results available.' : ''}`
    };
  })
  .build();
