import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let starSegment = SlateTool.create(spec, {
  name: 'Star Segment',
  key: 'star_segment',
  description: `Star or unstar a segment for the authenticated athlete. Starred segments appear in the athlete's starred segments list. Requires \`profile:write\` scope.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      segmentId: z.number().describe('The segment identifier'),
      starred: z.boolean().describe('Whether to star (true) or unstar (false) the segment')
    })
  )
  .output(
    z.object({
      segmentId: z.number().describe('Segment identifier'),
      name: z.string().describe('Segment name'),
      starred: z.boolean().describe('New star status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let segment = await client.starSegment(ctx.input.segmentId, ctx.input.starred);

    return {
      output: {
        segmentId: segment.id,
        name: segment.name,
        starred: segment.starred
      },
      message: ctx.input.starred
        ? `Starred segment **${segment.name}**.`
        : `Unstarred segment **${segment.name}**.`
    };
  })
  .build();
