import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSegment = SlateTool.create(spec, {
  name: 'Get Segment',
  key: 'get_segment',
  description: `Retrieve details of a specific FullStory segment by its ID. Returns the segment name, creator, creation date, and URL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      segmentId: z.string().describe('ID of the segment to retrieve')
    })
  )
  .output(
    z.object({
      segmentId: z.string().describe('Segment ID'),
      name: z.string().describe('Segment name'),
      creator: z.string().optional().describe('Email of the segment creator'),
      created: z.string().optional().describe('When the segment was created (ISO 8601)'),
      url: z.string().optional().describe('URL to view this segment in FullStory')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let segment = await client.getSegment(ctx.input.segmentId);

    return {
      output: segment,
      message: `Retrieved segment **${segment.name}**.`
    };
  })
  .build();
